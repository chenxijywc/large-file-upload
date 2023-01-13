import service from '@/utils/request'
import axios from 'axios'

export interface CheckFileReq{
  md5:string | unknown
}
export interface mergeSliceReq{
  folderPath:string
  fileMd5:string
  justMd5:string
  nameSuffix:string
  fileName:string
}

// 查看文件
export function checkFile(data:CheckFileReq) {
  return service.post('/checkFile',data)
}
// 上传文件
export function update(data:FormData,onUploadProgress:(progress:ProgressEvent)=>void,getCancelToken:(cancel:Function)=>void) {
  const CancelToken = axios.CancelToken
  return service.post('/update',data,{onUploadProgress,cancelToken:new CancelToken(getCancelToken)})
}
// 合并所有切片
export function mergeSlice(data:mergeSliceReq) {
  return service.post('/mergeSlice',data)
}