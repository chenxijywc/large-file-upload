import request from '../utils/request'

interface UpDataReq{
    file:string
    sliceFileSize:number
    index:number
    fileSize:number
    fileName:string
    sliceNumber:number
    userId:string
}
interface UpDataRes{
    
}

export function updata(data:UpDataReq,onUploadProgress:()=>void) {
    return request.post<UpDataRes>('/updata',data,{onUploadProgress})
}