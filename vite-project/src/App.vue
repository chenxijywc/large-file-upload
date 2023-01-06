<template>
  <div class="page">
    <el-progress :text-inside="true" :stroke-width="20" :percentage="percentage" status="success"/>
    <div class="topBox"> 
      <input type="file" class="isInput" @change="inputChange">
    </div>
    <div style="text-align:right;">
      <el-button type="warning" round @click="stopUpdata">中止上传</el-button>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import {updata,UpDataReq} from '@/api/home'
  import SparkMD5 from "spark-md5";
  import {source} from '@/utils/request'
  console.clear()
  // 显示到视图层的初始数据:
  const percentage = ref(0)
  let unit = 1024*1024*5  //每个切片的大小定位5m
  // let unit = 1024*1024*100
  //页面一打开就调用:
  onMounted(()=>{
    // console.log('1111111111')
    // console.log('1111111111')
    // setTimeout(() => {
    //   console.clear()
    // }, 5000)
    
  })
  // 注册事件:
  // 中止上传
  const stopUpdata = () =>{
    let isInput = document.querySelector('.isInput') as HTMLInputElement
    isInput.value = ''
    source.cancel('stopRequest')
  }
  // 输入框change事件
  const inputChange = (e:Event) =>{
    let userId = `5421-${new Date().getTime()}` // 带时间搓的用户id,标记数据的唯一性
    let target = e.target as HTMLInputElement
    let file = (target.files as FileList)[0]
    let sliceNumber = Math.ceil(file.size/unit)  // 向上取证切割次数,例如20.54,那里就要为了那剩余的0.54再多遍历一次
    let allDatas:Array<UpDataReq> = []
    let allPromiseArr:Array<any> = []
    for (let i = 0; i < sliceNumber; i++) {
      let sliceFile = file.slice(i*unit,i*unit+unit)
      setMd5(sliceFile).then((res)=>{
          // let fd = new FormData()
          // fd.append('file',res)
          // fd.append('sliceFileSize',sliceFile.size)
          // fd.append('index',i)
          // fd.append('fileSize',file.size)
          // fd.append('fileName',file.name)
          // fd.append('sliceNumber',sliceNumber)
          // fd.append('userId',userId)
          let needObj:UpDataReq = {
            file:res,
            sliceFileSize:sliceFile.size,
            index:i,
            fileSize:file.size,
            fileName:file.name,
            sliceNumber,
            userId
          }
          allDatas.push(needObj)  // 放到一个数组里,预防其中一个请求断了
          // console.log(allDatas,'里边')
          allPromiseArr.push(updataRequest(needObj))
          if(allPromiseArr.length === sliceNumber){
            // console.log(allPromiseArr,'allPromiseArr')
            Promise.all(allPromiseArr).then((res)=>{
              // console.log(res,'所有都完成了---------------------------------')
            }).catch((err)=>{
              console.log(err,'失败或者被中止了---------------------------------')
              // 其中一个失败了都中止请求,可是请求过程中其中一个请求被强制中止了也会触发这里一次
              let {isStopRequest} = err
              !isStopRequest ? source.cancel() : ''
            })
          }
      })
    }
  }
  // 将上传文件请求封装成Promise,为了使用Promise.all
  const updataRequest = (needObj:UpDataReq) => {
    return new Promise((resolve,reject)=>{
      updata(needObj,(progress)=>{
        console.log(Math.round(progress.loaded / progress.total * 100) + '%')
        let needProgress = Math.round(progress.loaded / progress.total * 100)  // 已经加载的文件大小/文件的总大小
        percentage.value = needProgress
      }).then((res)=>{
        // console.log(res,'返回响应数据')
        res.result === 1 ? resolve(needObj.userId) : reject({userId:needObj.userId,isStopRequest:false})
        resolve(needObj.userId)
      }).catch((err)=>{
        console.log(err,'err')
        if(err && err.message === 'stopRequest'){
          reject({userId:needObj.userId,isStopRequest:true})
        }else{
          reject({userId:needObj.userId,isStopRequest:false})
        }
      })
    } )
  }
  // md5加密
  const setMd5 = (file:Blob) =>{
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
