<template>
  <div class="page">
    <el-progress :text-inside="true" :stroke-width="20" :percentage="percentage" status="success" class="progressBox"/>
    <div class="topBox"> 
      <input type="file" class="isInput" @change="inputChange">
    </div>
  </div>
</template>
<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import {updata} from './api/home.ts'
  import SparkMD5 from "spark-md5";
  const percentage = ref(0)
  // let unit = 1024*1024*5  //每个切片的大小定位5m
  let unit = 1024*1024*100
  // 输入框change事件
  const inputChange = (e) =>{
    let userId = `5421-${new Date().getTime()}` // 用户id,标记数据的唯一性
    let file = e.target.files[0]
    console.log(file,'file')
    let sliceNumber = Math.ceil(file.size/unit)  // 向上取证切割次数,例如20.54,那里就要为了那剩余的0.54再多遍历一次
    let allDatas = []
    for (let i = 0; i < sliceNumber; i++) {
        let sliceFile = file.slice(i*unit,i*unit+unit)
        setMd5(sliceFile).then((res)=>{
            let needObj = {
              file:res,
              sliceFileSize:sliceFile.size,
              index:i,
              fileSize:file.size,
              fileName:file.name,
              sliceNumber,
              userId,
            }
            allDatas.push(needObj)  // 放到一个数组里,预防其中一个请求断了
            console.log(allDatas,'里边')
            updata(needObj,(progress)=>{
                console.log(progress)
                console.log(Math.round(progress.loaded / progress.total * 100) + '%')
                let needProgress = Math.round(progress.loaded / progress.total * 100)  // 已经加载的文件大小/文件的总大小
                percentage.value = needProgress
            }).then((res)=>{
                console.log(res,'返回响应数据')  
            }).catch((err)=>{
                console.log(err)
            })
        })
    }
  }
// md5加密
const setMd5 = (file) =>{
  return new Promise((resolve,reject)=>{
    let sparkMD52 = new SparkMD5.ArrayBuffer()
    let reader = new FileReader()
    reader.readAsArrayBuffer(file)
    reader.onload = (event) => {
      let str = event.target.result
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
  .page{padding:80px;}
  .progressBox{max-width:1000px;margin:0 auto;}
  .topBox{text-align: center;padding: 80px;}
</style>
