import MessagePack from 'msgpack-lite';
import handleEvent from "./handleEventTypes.ts";
import { Vector3, Vector4 } from "./vectors.ts";
import { EventEmitter } from "node:events";
import { Buffer } from "node:buffer";

class GObject {
    position: Vector3 = new Vector3(0, 0, 0);
    quaternion: Vector4 = new Vector4(0, 0, 0, 0);
}

export class Cat extends GObject {
    uuid: string = "";
    name: string = "";
    flagEmoji: string = undefined;
    latestEvent: number = 0;
    constructor(name?: string) {
        super()
        this.name = name ?? ""
    }
    setPosition(x: number, y: number, z: number, t: number) {
        if (t < this.latestEvent) return
        this.latestEvent = t
        this.position.set(x,y,z)
    }

    setQuaternion(x: number, y: number, z: number, w: number, t: number) {
        if (t < this.latestEvent) return
        this.latestEvent = t
        this.quaternion.set(x, y, z, w)
    }
}

export class Rat extends GObject {
    collected = false;
    setCollected(c:boolean) {
        this.collected = c
    }
    setPosition(x: number, y: number, z: number) {
        this.position.set(x,y,z)
    }
    setQuaternion(x: number, y: number, z: number, w: number) {
        this.quaternion.set(x, y, z, w)
    }
}

export class Bot {
    ws = new WebSocket("wss://worlds.twotwelve.uk/ws");

    world = new Map<string, Cat>();
    cat = new Cat("");
    rat: Rat = new Rat();

    uuid = null;
    nameToken?: string = undefined;
    geoToken?: string = undefined;
    targetToken?: string = undefined;

    lastCatPosition?: Vector3 = undefined;
    lastCatQuaternion?: Vector4 = undefined;
    lastMessageSentAt?: number = undefined;

    pid: number = 0;

    events = new EventEmitter()
    async onmessage (event: MessageEvent) {
        let eventPayload
        if (event.data instanceof Blob) {
            const ab = Buffer.from(await event.data.arrayBuffer())
            // console.log(ab)
            eventPayload = MessagePack.decode(ab)
        } else {
            eventPayload = JSON.parse(event.data)
        }
        if (!eventPayload) {
            console.log("Malformed event data:", event.data)
            return
        }
        if(eventPayload.type != "position") console.log("got", eventPayload.type, "packet", this.pid++)
        handleEvent(eventPayload, this)
    }

    onclose () {
        console.info("Websocket connection closed, reopening");
        this.world.clear()
        // this.ws = new WebSocket("wss://worlds.twotwelve.uk/ws");
        // this.initWebsockets(this)
    }
    
    transitionPosition(myCat: Cat, rat: Rat, duration: number = 50) {
        const start = performance.now();
        console.info("MOVING TO", Object.values(rat.position ?? {x:0,y:0,z:0}))
        const startPosition = { ...myCat.position };
        const endPosition = { ...rat.position };
        let time = 0
        function animate() {
            time++
            const elapsed = time - start;
            const progress = Math.min(elapsed / duration, 1); // Clamp to [0, 1]
    
            // Interpolating the position
            myCat.position.x = startPosition.x + (endPosition.x - startPosition.x) * progress;
            myCat.position.z = startPosition.z + (endPosition.z - startPosition.z) * progress;
    
            // Continue the animation until the transition is complete
            if (progress < 1) {
                setTimeout(animate, 0.1);
            } else {
                console.log("finished animation")
            }
        }
    
        animate()
    }

    initWebsockets(bot: Bot) {
        this.ws.addEventListener("message", (event: MessageEvent) => {this.onmessage.call(bot, event)});
        this.ws.addEventListener("open",  ()=>{console.info("Websocket connection opened");bot.onlogin(bot)})
        this.ws.addEventListener("close", ()=>this.onclose.call(bot))
    }

    onratposchange() {
        
        // let prevPos = "{}"
        
        // setInterval(()=>{
        //     if(prevPos != JSON.stringify(rat.object.position)) {
        //         console.debug(`${prevPos} != ${JSON.stringify(rat.object.position)}`)
        //         prevPos = JSON.stringify(rat.object.position);
        //         transitionPosition(myCat, rat); 
        //     }
        //     worldConfig.myCat.rotateY(-1) // spin the cat, remove this line if you dont want the cat to spin
        // }, 500)
        console.log("got rat event, starting animation")
        // transitionPosition(this.cat, this.rat)
    }

    constructor () {
        this.initWebsockets(this);
        
    }

    onlogin(bot: Bot) {
        console.info("!!!! onlogin")
        setTimeout(()=>bot.transitionPosition(bot.cat, bot.rat), 50000)
        function getGeoToken() {
            // If the token is in local storage, reuse it
            // let storageGeoToken = getCookie("geoToken")
            // if (storageGeoToken !== null) {
            //     console.info("Using stored geoToken")
            //     worldConfig.geoToken = storageGeoToken
            //     clearInterval(geoTokenInterval)
            //     return
            // }

            // If not, poll the server for a getoken until we get one
            fetch("https://worlds.twotwelve.uk/locateme").then(
                (response)=>response.json()
            ).then(
                (json)=>{
                    if (json.token !== undefined) {
                        bot.geoToken = json.token
                        // setCookie("geoToken", json.token, 1)
                        clearInterval(geoTokenInterval)
                    }
                }
            ).catch(
                (error)=>{console.log(error)}
            )
        }

        const geoTokenInterval = setInterval(getGeoToken, 15*1000)
        getGeoToken()
        setInterval(()=>{
            // If the websocket closed, clear out all the cats
            if (bot.ws === undefined || bot.ws.readyState === bot.ws.CLOSED) {
                bot.world.clear()
                return
            }

            // If the websocket isn't in OPEN state then we can't send to it yet so just return
            if (bot.ws.readyState !== bot.ws.OPEN) {
                return
            }

            // Get our cat's position and check if it's moved enough to send a new message
            const catWorldPosition = bot.cat.position
            const catQuaternion = bot.cat.quaternion
            if (bot.lastCatPosition === undefined || bot.lastCatQuaternion === undefined || bot.lastMessageSentAt === undefined
                || catWorldPosition.distanceTo(bot.lastCatPosition) > 0.1 // Or we've moved more than 0.1 units
                // || catQuaternion.angleTo(lastCatQuaternion) > 5 * Math.PI / 180 // Or we've rotated more than 5 deg
                || Date.now() - bot.lastMessageSentAt > 1000 // Or the last message sent was >1s ago
            ) {
                // If we have a targetToken, check the distance to the rat - if it's close enough, we include the
                // targetToken in the message to the server to gain a point for our country.
                var includeTargetTokenInMessage = false
                if (bot.targetToken !== undefined) {
                    const ratWorldPosition = bot.rat.position
                    const ratDistance = ratWorldPosition.distanceTo(catWorldPosition)
                    includeTargetTokenInMessage = ratDistance < 1.5
                }

                if (includeTargetTokenInMessage && bot.cat.flagEmoji !== undefined && !bot.rat.collected) {
                    bot.rat.setCollected(true)
                    // if (worldConfig.leaderboard === undefined) {
                    //     worldConfig.leaderboard = {}
                    // }
                    // if (!(worldConfig.flagEmoji in worldConfig.leaderboard)) {
                    //     worldConfig.leaderboard[worldConfig.flagEmoji] = 1
                    // } else {
                    //     worldConfig.leaderboard[worldConfig.flagEmoji] += 1
                    // }
                    // updateCountryScore()
                    // updateLeaderboardTable()
                    // worldConfig.rat.setName(`${worldConfig.flagEmoji} +1`)
                    // pointSound.play()
                }

                bot.lastCatPosition = catWorldPosition.clone()
                bot.lastCatQuaternion = catQuaternion.clone()
                bot.lastMessageSentAt = Date.now()
                bot.ws.send(
                    `{` +
                    `"worldPosition":[${catWorldPosition.toArray()}],` +
                    `"quaternion":[${bot.cat.quaternion.toArray()}]` +
                    (bot.nameToken !== undefined ? `,"name":"${bot.nameToken}"` : ``) +
                    (bot.geoToken !== undefined ? `,"flagEmoji":"${bot.geoToken}"` : ``) +
                    (includeTargetTokenInMessage ? `,"targetToken":"${bot.targetToken}"` : ``) +
                    `}`.replace(/\s/g,'')
                )
            }
        }, 1000/24)
    }
}