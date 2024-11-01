export class Vector3 {
    x = 0;
    y = 0;
    z = 0;
    constructor (x=0, y=0, z=0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    set (x?: number, y?: number, z?: number) {
        if(x) this.x = x;
        if(y) this.y = y;
        if(z) this.z = z;
    }
    distanceToSquared(a:Vector3|number){
        const b=this.x-(a as Vector3).x,c=this.y-(a as Vector3).y;a=this.z-(a as Vector3).z;return b*b+c*c+a*a
    }
    distanceTo(a:Vector3){
        return Math.sqrt(this.distanceToSquared(a))
    }
    clone() {
        return new Vector3(this.x, this.y, this.z)
    }
    toArray() {
        return [this.x, this.y, this.z]
    }
}

export class Vector4 { // AKA quaternion
    x = 0;
    y = 0;
    z = 0;
    w = 0;
    constructor (x=0, y=0, z=0, w=0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }
    set (x?: number, y?: number, z?: number, w?: number) {
        if(x) this.x = x;
        if(y) this.y = y;
        if(z) this.z = z;
        if(w) this.w = w;
    }
    clone() {
        return new Vector4(this.x, this.y, this.z, this.w)
    }
    toArray() {
        return [this.x, this.y, this.z, this.w]
    }
}