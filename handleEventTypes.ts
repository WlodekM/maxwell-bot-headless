// deno-lint-ignore-file no-case-declarations ban-ts-comment no-explicit-any no-inner-declarations
import { Bot, Cat } from "./bot.ts";

export default function handle(eventPayload: any, bot: Bot) {
    switch (eventPayload.type) {
        // Name events tell us our own name
        case 'name':
            bot.uuid = eventPayload.uuid
            function getTokenPayload(token: string) {
                const splitToken = token.split('.');
                // console.debug(splitToken)
                const decodedToken = decodeURIComponent(
                    atob(
                        splitToken[1].replace(/-/g, '+').replace(/_/g, '/')
                    ).split('').map(function (c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    }).join('')
                )
                return JSON.parse(decodedToken)
            }
            if (
                (bot.nameToken === undefined && eventPayload.token !== undefined)
                || (getTokenPayload(eventPayload.token).IP !== getTokenPayload(bot.nameToken as string).IP)
                || (
                    getTokenPayload(eventPayload.token).FlagEmoji !== ""
                    && getTokenPayload(eventPayload.token).FlagEmoji !== getTokenPayload(bot.nameToken as string).FlagEmoji
                )
            ) {
                bot.nameToken = eventPayload.token
                if (eventPayload.flagEmoji !== undefined) {
                    bot.cat.name = eventPayload.name
                    bot.cat.flagEmoji = eventPayload.flagEmoji
                    // updateCountryScore()
                    // updateLeaderboardTable()
                } else {
                    bot.cat.name = eventPayload.name
                }
                console.log("got uuid", bot.uuid)
                console.debug("token payload", eventPayload.token)
                console.log("got name token and name", bot.nameToken, bot.cat.name, bot.cat.flagEmoji)
                // if(bot.cat.flagEmoji !== undefined) bot.onlogin(bot);
            }
            if (bot.world.has(eventPayload.uuid)) {
                // const otherCat = bot.world.get(eventPayload.uuid)
                // Immediately remove from scene, but leave 1s to receive any other
                // late events for this cat before deleting it from the otherCats map
                // otherCat.removeFromScene(scene)
                setTimeout(() => {
                    bot.world.delete(eventPayload.uuid)
                }, 1000)
            }
            break

        // Position events tell us about the positions of cats, which may be new
        case 'position':
            if (eventPayload.uuid === bot.cat.uuid) {
                break
            }
            if (!(bot.world.has(eventPayload.uuid))) {
                const newCat = new Cat(
                    eventPayload.name
                )
                // newCat.addToScene(scene)
                bot.world.set(eventPayload.uuid, newCat)
                // const catMessageCheckInterval = setInterval(()=>{
                //     if (!worldConfig.otherCats.has(eventPayload.uuid)) {
                //         clearInterval(catMessageCheckInterval)
                //         return
                //     }
                //     if (Date.now() - newCat.lastMessage > 10000) {
                //         newCat.removeFromScene(scene)
                //         worldConfig.otherCats.delete(eventPayload.uuid)
                //         clearInterval(catMessageCheckInterval)
                //     }
                // }, 100)
            } else {
                const otherCat = bot.world.get(eventPayload.uuid) as Cat
                // const otherCatOldPos = otherCat.position.clone()
                //@ts-ignore
                otherCat.setPosition(...eventPayload.worldPosition, eventPayload.time)
                //@ts-ignore
                otherCat.setQuaternion(...eventPayload.quaternion, eventPayload.time)
                if (eventPayload.flagEmoji !== undefined) {
                    otherCat.flagEmoji = eventPayload.flagEmoji
                }
                otherCat.name = eventPayload.name

                // If the cat has moved, tell the cat it's moving
                // const otherCatNewPos = otherCat.object.position
                // if (otherCatOldPos.distanceTo(otherCatNewPos) > 0.01) {
                //     otherCat.updateLastMoved(worldConfig.clock.getElapsedTime())
                // }
            }
            break

        // Move events tell us when a cat moves into a new chunk which we might be out of our view range
        // NOTE - unused, since the headless client doesn't render anything this is unnecessary
        // case 'move':
        //     if (!(bot.world.has(eventPayload.uuid))) {
        //         break
        //     }
        //     const otherCatToChunk = eventPayload.to.split("|").map(v => parseInt(v))
        //     const myCatChunk = bot.cat.getChunkID(25)
        //     const otherCatGoneTooFar = Math.max(
        //         ...myCatChunk.map(
        //             (chunkIDPart, index) => Math.abs(chunkIDPart - otherCatToChunk[index])
        //         )
        //     ) > 1
        //     if (otherCatGoneTooFar) {
        //         const otherCat = bot.world.get(eventPayload.uuid)
        //         // Immediately remove from scene, but leave 1s to receive any other
        //         // late events for this cat before deleting it from the otherCats map
        //         otherCat.removeFromScene(scene)
        //         setTimeout(() => {
        //             bot.world.delete(eventPayload.uuid)
        //         }, 1000)
        //     }
        //     break

        // ClientCount events tell us how many cats are currently connected to the same server as us
        // NOTE - unnecessary
        // case 'clientCount':
        //     document.getElementById("clientCount").classList = ""
        //     document.getElementById("clientCount").innerHTML =
        //         `cats online: ${eventPayload.count}`

        // Disconnect events tell us when another cat has disconnected
        case 'disconnect':
            if (!(bot.world.has(eventPayload.uuid))) {
                break
            }
            // const otherCat = bot.world.get(eventPayload.uuid)
            // Immediately remove from scene, but leave 1s to receive any other
            // late events for this cat before deleting it from the otherCats map
            // otherCat.removeFromScene(scene)
            setTimeout(() => {
                bot.world.delete(eventPayload.uuid)
            }, 1000)
            break

        case 'target':
            // Update the targetToken we'll give to the server if we get close enough
            bot.targetToken = eventPayload.token

            // Make the rat visible
            // worldConfig.rat.object.visible = true

            // There will be a new rat in 30s
            // worldConfig.timeUntilNextTarget = 30

            // Update the rat's position
            bot.rat.setPosition(
                eventPayload.worldPosition[0],
                eventPayload.worldPosition[1],
                eventPayload.worldPosition[2]
            )

            bot.onratposchange()
            console.log("firing onratposchange")

            // Reset the rat's name
            // worldConfig.rat.setName("Rat (30s)")
    }
}