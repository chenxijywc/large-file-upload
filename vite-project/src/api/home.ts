import request from '../utils/request'

export interface UpDataReq{
    file:string | unknown
    sliceFileSize:number
    index:number
    fileSize:number
    fileName:string
    sliceNumber:number
    userId:string
}
interface UpDataRes{
  myNameYYYYY:string
}

export function updata(data:UpDataReq,onUploadProgress:(progress:ProgressEvent)=>void) {
    return request.post<UpDataRes>('/updata',data,{onUploadProgress})
}