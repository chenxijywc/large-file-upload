import service from '@/utils/request'
import axios from 'axios'

export interface AllDatasItem{
  file:File | Blob | void
  fileMd5:string
  sliceFileSize:number
  index:number
  fileSize:number
  fileName:string
  sliceNumber:number
  progressArr:Array<number>  // 所有进度数组
  cancel?:Function | void
  finish?:boolean
}
export interface taskArrItem{
  id:number | string
  md5:string
  name:string
  state:number  // 0是什么都不做,1文件处理中,2是上传中,3是暂停,4是上传完成,5上传失败
  fileSize:number
  allDatas:Array<AllDatasItem>  // 所有请求成功或者请求未成功的请求信息
  finishNumber:number
  errNumber:number
  percentage:number  // 进度条
}
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
export interface sendUnfinishedReq{
  unfinishArr:Array<AllDatasItem>
}

// 查看文件
export function checkFile (data:CheckFileReq) {
  return service.post('/checkFile', data)
}
// 上传文件
export function update (data:FormData, onUploadProgress:(progress:ProgressEvent)=>void, getCancelToken:(cancel:Function)=>void) {
  const CancelToken = axios.CancelToken
  return service.post('/update', data, { onUploadProgress, cancelToken: new CancelToken(getCancelToken) })
}
// 合并所有切片
export function mergeSlice (data:mergeSliceReq) {
  return service.post('/mergeSlice', data)
}
// 中止上传接口
export function sendUnfinished (data:sendUnfinishedReq) {
  return service.post('/sendUnfinished', data)
}
// 继续上传接口
// export function goonUpdate(data:goonUpdateReq) {
//   return service.post('/goonUpdate',data)
// }