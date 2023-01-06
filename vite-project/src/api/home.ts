import {service,source} from '@/utils/request'

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
    return service.post<UpDataRes>('/updata',data,{onUploadProgress,cancelToken:source.token})
}