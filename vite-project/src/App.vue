<template>
  <div class="page">
    <el-progress :text-inside="true" :stroke-width="20" :percentage="percentage" status="success" :color="customColors"/>
    <div class="topBox"> 
      <input type="file" class="isInput" @change="inputChange">
    </div>
    <div style="text-align:right;">
      <el-button type="primary" round @click="reset">重置</el-button>
      <el-button type="danger" round @click="stopUpdate">中止上传</el-button>
      <el-button type="primary" round @click="goonUpdate">继续上传</el-button>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import {update,checkFile} from '@/api/home'
  import SparkMD5 from "spark-md5";
  interface AllDatasItem{
    file:File | unknown
    fileMd5:string | unknown
    sliceFileSize:number
    index:number
    fileSize:number
    fileName:string
    sliceNumber:number
    progressArr:Array<number>
    cancel?:Function
    finish?:boolean
  }
  // 显示到视图层的初始数据:
  const percentage = ref(0)
  let unit = 1024*1024*5  //每个切片的大小定位5m
  let allDatas:Array<AllDatasItem> = []
  let allPromiseArr:Array<any> = []  // 所有分片的请求
  const customColors = [
    { color: '#f56c6c', percentage: 20 },
    { color: '#e6a23c', percentage: 40 },
    { color: '#5cb87a', percentage: 60 },
    { color: '#1989fa', percentage: 80 },
    { color: '#6f7ad3', percentage: 100 },
  ]
  //页面一打开就调用:
  onMounted(()=>{
    
  })
  // 注册事件:
  // 重置,包括进度条
  const reset = () =>{
    let isInput = document.querySelector('.isInput') as HTMLInputElement
    isInput.value = ''
    percentage.value = 0 
  }
  // 中止上传
  const stopUpdate = () =>{
    allDatas.map((item) => { item.cancel ? item.cancel('stopRequest') : '' })
  }
  // 继续上传
  const goonUpdate = () =>{
    let otherArr = allDatas.filter(item => !item.finish)
    if(otherArr.length > 0){
      allPromiseArr = [] 
      const progressTotal = 100 - percentage.value
      for (const item of otherArr) {
        item.progressArr = []
        slicesUpdate(allPromiseArr,item,otherArr.length,progressTotal)
      }
    }
  }
  // 输入框change事件
  const inputChange = async(e:Event) =>{
    let target = e.target as HTMLInputElement
    let file = (target.files as FileList)[0]
    if(!file) return
    let res = await encryptionMd5(file)
    let fileMd5 = res
    let resB = await checkFile({md5:fileMd5})
    // 返回1说明数据库没有
    if(resB.result === 1){
      let sliceNumber = Math.ceil(file.size/unit)  // 向上取证切割次数,例如20.54,那里就要为了那剩余的0.54再多遍历一次
      allPromiseArr = []  // 清空分片请求
      for (let i = 0; i < sliceNumber; i++) {
        let sliceFile = file.slice(i*unit,i*unit+unit)
        let needObj:AllDatasItem = {
          file,
          fileMd5,
          sliceFileSize:sliceFile.size,
          index:i,
          fileSize:file.size,
          fileName:file.name,
          sliceNumber,
          progressArr:[],
          finish:false
        }
        allDatas.push(needObj)  // 放到一个数组里,预防其中一个请求断了
        slicesUpdate(allPromiseArr,needObj,sliceNumber)
      }
    }
  }
  // 切片上传
  const slicesUpdate = (allPromiseArr:Array<any>,needObj:AllDatasItem,sliceNumber:number,progressTotal = 100) =>{
    let fd = new FormData()
    for (const key in needObj) {
      let value = needObj[key]
      let dataType = Object.prototype.toString.call(value)
      dataType !== '[object Array]' && ['[object File]','[object String]'].includes(dataType) ? fd.append(key,value) : fd.append(key,String(value))
    }
    allPromiseArr.push(AllDatasItemuest(fd,needObj,progressTotal))
    if(allPromiseArr.length === sliceNumber){
      Promise.all(allPromiseArr).then(()=>{
        percentage.value = 100
        console.log('所有都完成了---------------------------------')
      }).catch((err)=>{
        // 其中一个失败了都中止请求,可是请求过程中其中一个请求被强制中止了也会触发这里一次
        err.message !== 'stopRequest' ? stopUpdate() : ''
      })
    }
  }
  // 将上传文件请求封装成Promise,为了使用Promise.all
  const AllDatasItemuest = (fd:FormData,needObj:AllDatasItem,progressTotal:number) => {
    return update(fd,(progress)=>{
        let progressArr = needObj.progressArr
        let finishSize = progress.loaded
        if(progressArr.length > 0){
          let endItem = progressArr.slice(-1)[0]
          finishSize = finishSize - endItem
        }
        let placeholder = progressTotal/needObj.sliceNumber  // 每一片占100的多少
        let needProgress = placeholder*(finishSize / progress.total)  // 只占份数最新完成了多少
        // let needProgress = Math.round(progress.loaded / progress.total * 100)  // 已经加载的文件大小/文件的总大小
        progressArr.push(progress.loaded)
        percentage.value = percentage.value + needProgress
        progress.loaded === progress.total ? needObj.finish = true : ''  // 这一片完全加载完就将指定对象设置属性为true
        console.log(percentage.value)
      },(cancel)=>{
          needObj.cancel = cancel   
      })
  }
  // md5加密
  const encryptionMd5 = (file:Blob) =>{
    return new Promise((resolve,reject)=>{
      let sparkMD52 = new SparkMD5.ArrayBuffer()
      let reader = new FileReader()
      reader.readAsArrayBuffer(file)
      reader.onload = (event:ProgressEvent) => {
        let target = event.target as FileReader
        let str = target.result
        sparkMD52.append(str)
        let md = sparkMD52.end() 
        resolve(md)
      }
      reader.onerror = (err) => {
        reject(err)
      }
    })
  }
</script>
<style scoped>
  .page{padding:80px;max-width:1000px;margin:0 auto;}
  .topBox{text-align: center;padding: 80px;}
  :deep(.el-progress-bar__innerText){color: black;}
</style>
