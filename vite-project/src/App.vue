<template>
  <div class="page">
    <div class="content">
      <ListItem :taskArr="taskArr" @pauseUpdate="pauseUpdate" @goonUpdate="goonUpdate" @reset="reset"/>
      <!-- <div class="listItem" v-for="(item,index) in taskArr" :key="item.id">
         <div class="leftBox">
            <div class="leftBox_fileName">
              {{item.name}}
            </div>
            <div class="leftBox_percentage">
              <div class="percentageBac">
                <div class="percentageBox" :style="{width: `${item.percentage}%`}">
                </div>
                <div class="percentageBox_sapn">
                  <span>{{Math.floor(item.percentage)}}%</span>
                </div>
              </div>
              <div>
                <div v-if="item.state === 0" style="height:24px;width: 100%;"></div>
                <p v-else-if="item.state === 1">文件正在处理中...</p>
                <p v-else-if="item.state === 2">文件正在上传中...</p>
                <p v-else-if="item.state === 3">暂停中</p>
                <p v-else-if="item.state === 4">上传完成</p>
                <p v-else-if="item.state === 5">上传失败</p>
              </div>
            </div>
         </div>
         <div class="rightBtn">
            <div class="mybtn redBtn" @click="pauseUpdate(item)" v-if="[1,2].includes(item.state)">暂停</div>
            <div class="mybtn blueBtn" @click="goonUpdate(item)" v-if="[3].includes(item.state)">继续</div>
            <div class="mybtn redBtn" @click="reset(item)">取消</div>
         </div>
      </div> -->
    </div>
    <div class="bottomBox"> 
      <div class="inputBtn">
          选择文件上传
          <input type="file" class="isInput" @change="inputChange">
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { onMounted, ref, getCurrentInstance, toRaw, watch } from 'vue'
  import {update,checkFile,mergeSlice,AllDatasItem,taskArrItem} from '@/api/home'
  import ListItem from '@/listItem.vue'
  import SparkMD5 from "spark-md5";
  // 显示到视图层的初始数据:
  let lastTime:any = ref()
  const localForage = (getCurrentInstance()!.proxy as any).$localForage
  const unit = 1024*1024*5  //每个切片的大小定位5m
  let taskArr = ref<Array<taskArrItem>>([])
  let requestNumber = 0  // 所有请求的个数
  // 监听任务改变
  watch(() =>  taskArr.value, (newVal,oldVal) => {
    if(!(newVal.length === 0 && oldVal.length === 0)){
      console.log('我改变了')
      // 防抖处理,如果200毫秒内频繁的触发就不执行,200毫米之后才触发一次
      lastTime ? clearTimeout(lastTime) : ''
      lastTime = setTimeout(()=>{
        setTaskArr()    
      },200)
    }
  },{deep:true})
  // 页面一打开就调用:
  onMounted(()=>{
    getTaskArr()
  })
  // 注册事件:
  // 暂停
  const pauseUpdate = (item:taskArrItem,elsePause=true) =>{
    // console.log(item.allDatas.length,'还剩下多少片要继续上传的')
    elsePause ? item.state = 3 : item.state = 5  // elsePause为true,就是纯暂停.为false就是上传都失败了
    item.errNumber = 0
    for (const itemB of item.allDatas) {
      itemB.cancel ? itemB.cancel('stopRequest') : ''
    }
  }
  // 继续
  const goonUpdate = (item:taskArrItem) =>{
    item.state = 2
    if(item.allDatas.length > 0){
      const progressTotal = 100 - item.percentage
      for (const itemB of item.allDatas) {
        itemB.progressArr = []
        slicesUpdate(itemB,item,progressTotal)
      }
    }
  }
  // 取消
  const reset = async(item:taskArrItem) =>{
    pauseUpdate(item)
    taskArr.value = toRaw(taskArr.value).filter(itemB => itemB.id !== item.id)
  }
  // 输入框change事件
  const inputChange = (e:Event) =>{
    let target = e.target as HTMLInputElement
    let file = (target.files as FileList)[0]
    if(!file) return
    target.value = ''
    let inTaskArrItem:taskArrItem = {
      id:new Date().getTime(),
      md5:'',
      name:file.name,
      state:0,
      allDatas:[],  // 所有请求的数据
      finishNumber:0,  //请求完成的个数
      errNumber:0,  // 报错的个数,默认是0个,超多3个就是直接上传失败
      percentage:0
    }
    taskArr.value.push(inTaskArrItem)
    inTaskArrItem = taskArr.value.slice(-1)[0]
    inTaskArrItem.state = 1
    let worker = new Worker('./js/hash.js')  //复杂的计算,使用web Worker提高性能
    worker.postMessage({file})
    worker.onmessage = async(e) =>{
      console.log(e.data,'md5加密完成')
      let {name,data} = e.data
      if(name === 'succee'){
        inTaskArrItem.state = 2
        inTaskArrItem.md5 = data
        let fileMd5 = data
        let resB = await checkFile({md5:fileMd5}).catch(()=>{})
        // 返回1说明数据库没有
        if(resB && resB.result === 1){
          let sliceNumber = Math.ceil(file.size/unit)  // 向上取证切割次数,例如20.54,那里就要为了那剩余的0.54再多遍历一次
          console.log(sliceNumber,'一共多少片')
          for (let i = 0; i < sliceNumber; i++) {
            let sliceFile = file.slice(i*unit,i*unit+unit) 
            let needObj:AllDatasItem = {
              file:sliceFile,
              fileMd5:`${fileMd5}-${i}`,
              sliceFileSize:sliceFile.size,
              index:i,
              fileSize:file.size,
              fileName:file.name,
              sliceNumber,
              progressArr:[],
              finish:false
            }
            inTaskArrItem.allDatas.push(needObj)  
          }
          for (const item of inTaskArrItem.allDatas) {
            // 暂停了就不继续遍历了
            if(inTaskArrItem.state === 3){return}
            // 没满就继续请求,满6个就推迟代码1秒
            requestNumber++
            if(requestNumber === 6){
              await new Promise(resolve => setTimeout(() => { resolve(null) }, 1000))
              requestNumber = 0
            }
            inTaskArrItem.state !== 3 ? slicesUpdate(item,inTaskArrItem) : ''
          }
        }else{
          pauseUpdate(inTaskArrItem,false)
        }
      }
    }
  }
  // 切片上传
  const slicesUpdate = (needObj:AllDatasItem,taskArrItem:taskArrItem,progressTotal = 100) =>{
    let fd = new FormData()
    let {file,fileMd5,sliceFileSize,index,fileSize,fileName,sliceNumber} = needObj
    fd.append('file',file as File)
    fd.append('fileMd5',fileMd5)
    fd.append('sliceFileSize',String(sliceFileSize))
    fd.append('index',String(index))
    fd.append('fileSize',String(fileSize))
    fd.append('fileName',fileName)
    fd.append('sliceNumber',String(sliceNumber))
    AllDatasItemuest(fd,needObj,taskArrItem,progressTotal).then(async(res)=>{
      taskArrItem.errNumber > 0 ? taskArrItem.errNumber-- : ''
      taskArrItem.finishNumber++
      needObj.finish = true
      taskArrItem.allDatas = taskArrItem.allDatas.filter(item => item.index !== needObj.index)
      if(taskArrItem.finishNumber === sliceNumber){
        let resB = await mergeSlice(res.data).catch(()=>{})
        if(resB && resB.result === 1){
          taskArrItem.percentage = 100
          taskArrItem.state = 4
          console.log(taskArrItem,'所有都完成了---------------------------------')
        }
        taskArrItem.finishNumber = 0
      }
    }).catch((err)=>{
      if(taskArrItem.state === 5){return}  // 你都已经上传失败了,就什么都不用做了
      if(!(err.message && err.message === 'stopRequest')){
        console.log(err.message,'真的请求失败了')
        taskArrItem.errNumber++ 
        // 如果其中一个失败就就将那一切片再次发送请求了,超过3次之间上传失败
        if(taskArrItem.errNumber > 3){
          pauseUpdate(taskArrItem,false)
        }else{
          slicesUpdate(needObj,taskArrItem)
        }
      }
    })
  }
  // 将上传文件请求封装
  const AllDatasItemuest = (fd:FormData,needObj:AllDatasItem,taskArrItem:taskArrItem,progressTotal:number) => {
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
        let enPercentage = taskArrItem.percentage + needProgress
        if(taskArrItem.percentage < enPercentage && enPercentage < 100){ 
          taskArrItem.percentage = enPercentage 
        }
      },(cancel)=>{
        needObj.cancel = cancel   
      })
  }
  // 获取任务
  const getTaskArr = async() =>{
      let arr = await localForage.getItem('taskArr').catch(()=>{})
      if(!arr || arr.length === 0){return}
      for (const item of arr) {
        item.state === 2 ? item.state = 3 : ''
      }
      taskArr.value = arr
  }
  // 存储任务到缓存
  const setTaskArr = async() =>{
    // localForage这个库的api不兼容Proxy对象,要处理一下
    const needTaskArr = toRaw(taskArr.value)
    let allDatasArr = needTaskArr.map(item => item.allDatas)
    for (const item of allDatasArr) {
      for (let i = 0; i < item.length; i++) {
        const newItem = toRaw(item[i])
        newItem.file = undefined
        newItem.cancel = undefined
        item.splice(i,1,newItem)
      }
    }
    localForage.setItem('taskArr',needTaskArr).then(()=>{
      console.log('存储成功')
    }).catch(()=>{
      console.log('存储失败')
    })
  }
  // 监听浏览器点击刷新按钮
  const isOnbeforeunload = () =>{
    window.onbeforeunload = function(){
      setTaskArr()        
    };
  }
  // md5加密
  const encryptionMd5 = (file:Blob) =>{
    return new Promise((resolve,reject)=>{
      let sparkMD52 = new SparkMD5.ArrayBuffer()
      let reader = new FileReader()
      reader.readAsArrayBuffer(file)
      reader.onload = (event:ProgressEvent) => {
        console.log(event.target,'event.target')
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
<style  scoped>
  .page{padding:100px;margin:0 auto;background-color: #303944;width: 100%;height: 100vh;color:#ffffff;}
  .content{min-height: 60vh;}
  :deep(.el-progress-bar__innerText){color: black;}
  /* .listItem{margin-bottom: 22px;display: flex;animation: fadeIn;animation-duration: 1s;} */
  .listItem{margin-bottom: 22px;display: flex;}
  .percentageBac{height:24px;width: 100%;border-radius: 8px;background-color: #1b1f24;margin-bottom: 10px;box-shadow: 0 5px 10px rgba(0, 0, 0, .51) inset;
                  position: relative;overflow: hidden;}
  .percentageBox{height:100%;transition: all 1s;background-color: #73c944;border-radius: 8px;display: flex;justify-content: center;align-items: center;}
  .percentageBox_sapn{position: absolute;top:0;left: 0;width: 100%;display: flex;justify-content: center;font-size: 14px;}
  .leftBox{flex: 1;margin: 10px 0;display: flex;font-size: 14px;}
  .leftBox_percentage{flex: 1;margin: 0 10px;}
  .leftBox_fileName{width: 12%;min-width: 0;overflow: hidden;white-space: nowrap;text-overflow: ellipsis;}
  .rightBtn{display: flex;width:130px;font-size: 14px;justify-content: center;}
  .mybtn{padding: 2px 10px;height: 24px;border-radius: 8px;display: flex;cursor: pointer;margin: 10px 8px;opacity: 0.8;
        display: flex;justify-content: center;align-items: center;user-select: none;min-width: 48px;}
  .mybtn:hover{opacity: 1;}
  .blueBtn{background-color: #409eff;}
  .redBtn{background-color: #f56c6c;}
  .bottomBox{text-align: center;}
  .inputBtn>input{position: absolute;top: 0;left: 0;width: 100%;height: 100%;opacity: 0;cursor: pointer;}
  .inputBtn{width: 160px;background-color: #409eff;opacity: 0.8;position: relative;padding: 10px 16px;border-radius: 8px;margin: 0 auto;user-select: none;}
  .inputBtn:hover{opacity: 1;}
  @keyframes fadeIn{
  	0% {opacity: 0;}    
  	100% {opacity: 1;}  
  }
</style>
