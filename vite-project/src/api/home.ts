import service from '@/utils/request'
import axios from 'axios'

export interface CheckFileReq{
  md5:string | unknown
}

export function update(data:FormData,onUploadProgress:(progress:ProgressEvent)=>void,getCancelToken:(cancel:Function)=>void) {
  const CancelToken = axios.CancelToken
  return service.post('/update',data,{onUploadProgress,cancelToken:new CancelToken(getCancelToken)})
}
export function checkFile(data:CheckFileReq) {
  return service.post('/checkFile',data)
}