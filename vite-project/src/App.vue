<template>
  <div class="page">
    <div class="pageTop">
      <p>正在上传 ({{ statistics }})</p>
      <div class="pageTop_right" :style="{'justify-content': taskArr.length > 1 ? 'space-between' : 'flex-end'}">
        <p class="clearBtn" @click="clear" v-if="taskArr.length > 1">全部取消</p>
        <p class="clearBtn" @click="clickClearDir">清空本地和服务器存储的文件</p>
      </div>
    </div>
    <div class="content" ref="contentRef">
      <ListItem :task-arr="taskArr" @pauseUpdate="pauseUpdate" @goonUpdate="goonUpdate" @reset="reset"/>
    </div>
    <div class="bottomBox">
      <div class="inputBtn">
          选择文件上传
          <input type="file" multiple class="isInput" @change="inputChange">
      </div>
    </div>
  </div>
  <div class="messageList">
    <!-- <div class="messageBac">
      <div class="message">
          <p>合并成功</p>
      </div>
    </div> -->
  </div>
</template>
<script setup lang="ts">
  import { onMounted, ref, getCurrentInstance, toRaw, watch, computed, nextTick } from 'vue'
  import { update, checkFile, mergeSlice, AllDatasItem, taskArrItem, clearDir } from '@/api/home'
  import ListItem from '@/listItem.vue'
  // 显示到视图层的初始数据:
  const contentRef = ref()
  const localForage = (getCurrentInstance()!.proxy as any).$localForage
  const unit = 1024*1024*3  //每个切片的大小定位3m
  const taskArr = ref<Array<taskArrItem>>([])
  let updateingArr:Array<taskArrItem> = []
  const statistics = computed(()=>{
    const otherArr = taskArr.value.filter(item => item.state !== 4)
    return `${otherArr.length}/${taskArr.value.length}`
  })
  // 监听任务改变
  watch(() => taskArr.value, (newVal,oldVal) => {
    if(!(newVal.length === 0 && oldVal.length === 0)){
      setTaskArr()
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
      slicesUpdate(item,progressTotal)
    }
  }
  // 取消
  const reset = async(item:taskArrItem) =>{
    pauseUpdate(item)
    taskArr.value = toRaw(taskArr.value).filter(itemB => itemB.id !== item.id)
    updateingArr = updateingArr.filter(itemB => itemB.id !== item.id)
  }
  // 全部取消
  const clear = () =>{
    const allId = toRaw(taskArr.value).map(item => item.id)
    updateingArr = updateingArr.filter(item => !allId.includes(item.id))
    taskArr.value = []
  }
  // 清空
  const clickClearDir = async () =>{
    const res = await clearDir()
    if(res.result === 1){
      taskArr.value = []
      updateingArr = []
      localForage.clear()
      message('清空成功')
    }
  }
  // 设置已完成
  const isFinishTask = (item:taskArrItem) =>{
    item.percentage = 100
    item.state = 4
    console.log('上传完成---------------------------------')
  }
  // 输入框change事件
  const inputChange = async(e:Event) =>{
    const target = e.target as HTMLInputElement
    const files = target.files as FileList
    for (let h = 0; h < files.length; h++) {
      const file = files[h]
      console.log(file,'file')
      h === files.length-1 ? nextTick(()=>{ target.value = '' }) : ''
      let inTaskArrItem:taskArrItem = {
        id:new Date().getTime(),
        md5:'',
        name:file.name,
        state:0,
        fileSize:file.size,
        allDatas:[],  // 所有请求的数据
        finishNumber:0,  //请求完成的个数
        errNumber:0,  // 报错的个数,默认是0个,超多3个就是直接上传失败
        percentage:0
      }
      taskArr.value.push(inTaskArrItem)
      nextTick(()=>{ contentRef.value.scrollTop = (110 + 20) * (taskArr.value.length + 1) })  // 设置滚动条滚到最底部
      inTaskArrItem = taskArr.value.slice(-1)[0]
      inTaskArrItem.state = 1
      if(file.size === 0){
        pauseUpdate(inTaskArrItem,false)
        continue
      }
      const fileMd5 = await useWorker(file)
      // const fileZip = await zipWorker(file,fileMd5 as string)
      // console.log(fileZip,'压缩完成')
      inTaskArrItem.state = 2
      inTaskArrItem.md5 = fileMd5 as string
      const sliceNumber = Math.ceil(file.size/unit)  // 向上取证切割次数,例如20.54,那里就要为了那剩余的0.54再多遍历一次
      // 先看是不是有同一个文件在上传中或者在那暂停着
      // 再查本地再查远程服务器,本地已经上传了一半了就重新切割好对上指定的片,继续上传就可以了,state为2是上传中,3是暂停中
      const needUpdateingArr = updateingArr.filter(item => fileMd5 === item.md5 && item.state === 2)
      const theSameMd5Arr = toRaw(taskArr.value).filter(item => item.md5 === fileMd5)
      const needDelete = theSameMd5Arr.pop()
      if(theSameMd5Arr.length > 0){
        const needIndex = taskArr.value.findIndex((item) => item.id === needDelete.id)
        const needIndexB = taskArr.value.findIndex((item) => item.id === theSameMd5Arr[0].id)
        if(theSameMd5Arr[0].state === 2){
          message(`${theSameMd5Arr[0].name} 已经正在上传中了`)
          taskArr.value.splice(needIndex,1)
        }else{
          message(`${needDelete.name} 之前已经上传了部分,现在可以继续上传`)
          taskArr.value.splice(needIndex,1)
          taskArr.value[needIndexB].state = 2
          inTaskArrItem = taskArr.value[needIndexB]
          slicesUpdate(inTaskArrItem)
        }
      }else if(needUpdateingArr.length > 0){
        const updateTaskObj = needUpdateingArr[0]
        message(`${updateTaskObj.name} 之前已经上传了部分,现在可以继续上传`)
        for (let i = 0; i < sliceNumber; i++) {
          const inFileMd5 = `${updateTaskObj.md5}-${i}`
          const inAllDatasItem = updateTaskObj.allDatas.find((item) => item.fileMd5 === inFileMd5)
          inAllDatasItem ? inAllDatasItem.file = file.slice(i*unit,i*unit+unit) : ''
        }
        const needIndex = taskArr.value.findIndex((item) => item.md5 === fileMd5)
        taskArr.value.splice(needIndex,1,updateTaskObj)
        inTaskArrItem = taskArr.value[needIndex]
        slicesUpdate(inTaskArrItem)
      }else {
        try{
          const resB = await checkFile({md5:fileMd5})
          // 返回1说明服务器没有
          if(resB.result === 1){
            for (let i = 0; i < sliceNumber; i++) {
              const sliceFile = file.slice(i*unit,i*unit+unit)
              const needObj:AllDatasItem = {
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
            // console.log(inTaskArrItem,'inTaskArrItem')
            slicesUpdate(inTaskArrItem)
          }else{
            // 该文件已经上传完成了
            isFinishTask(inTaskArrItem)
          }
        }catch(err){
          pauseUpdate(inTaskArrItem,false)
          continue
        }
      }
    }
  }
  // Promise封装web Worker计算结果返回
  const useWorker = (file:File) =>{
    return new Promise((resolve,reject)=>{
      const worker = new Worker('./js/hash.js')  //复杂的计算,使用web Worker提高性能
      worker.postMessage({file})
      worker.onmessage = (e) =>{
        const {name,data} = e.data
        name === 'succee' ? resolve(data) : reject(data)
      }
    })
  }
  // 切片上传
  const slicesUpdate = (taskArrItem:taskArrItem,progressTotal = 100) =>{
    // console.log(taskArrItem,'taskArrItem')
    const needObj = taskArrItem.allDatas.slice(-1)[0]
    const fd = new FormData()
    const { file,fileMd5,sliceFileSize,index,fileSize,fileName,sliceNumber } = needObj
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
        const resB = await mergeSlice(res.data).catch(()=>{})
        resB && resB.result === 1 ? isFinishTask(taskArrItem) : pauseUpdate(taskArrItem,false)
        taskArrItem.finishNumber = 0
      }else{
        slicesUpdate(taskArrItem)
      }
    }).catch((err)=>{
      if(taskArrItem.state === 5){return}  // 你都已经上传失败了,就什么都不用做了
      if(!(err.message && err.message === 'stopRequest')){
        console.log(err.message,'真的请求失败了')
        taskArrItem.errNumber++
        // 超过3次之后上传失败
        if(taskArrItem.errNumber > 3){
          pauseUpdate(taskArrItem,false)  // 上传失败
        }
      }
    })
  }
  // 将上传文件请求封装
  const AllDatasItemuest = (fd:FormData,needObj:AllDatasItem,taskArrItem:taskArrItem,progressTotal:number) => {
    return update(fd,(progress)=>{
        const progressArr = needObj.progressArr
        let finishSize = progress.loaded
        if(progressArr.length > 0){
          const endItem = progressArr.slice(-1)[0]
          finishSize = finishSize - endItem
        }
        const placeholder = progressTotal/needObj.sliceNumber  // 每一片占100的多少
        const needProgress = placeholder*(finishSize / progress.total)  // 只占份数最新完成了多少
        progressArr.push(progress.loaded)
        const enPercentage = taskArrItem.percentage + needProgress
        if(taskArrItem.percentage < enPercentage && enPercentage < 100){
          taskArrItem.percentage = enPercentage
        }
      },(cancel)=>{
        needObj.cancel = cancel
      })
  }
  // 获取本地有没要继续上传的任务,状态为2都是可以继续上传的,1,4和5都没必要继续上传了
  const getTaskArr = async () =>{
    const arr = await localForage.getItem('taskArr').catch(()=>{})
      if(!arr || arr.length === 0){return}
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i]
        item.state === 3 ? item.state = 2 : ''
        if(item.state !== 2){
          arr.splice(i,1)
          i--
        }
      }
      updateingArr = arr
      console.log(updateingArr,'updateingArr')
  }
  // 存储任务到缓存
  const setTaskArr = async() =>{
    // localForage这个库的api不兼容Proxy对象和函数,要处理一下
    const needTaskArr = JSON.parse(JSON.stringify(taskArr.value))
    await localForage.setItem('taskArr',needTaskArr)
    console.log('存储成功')
  }
  // 消息提示
  const message = (msg:string,duration=3000) =>{
    const messageList = document.querySelector('.messageList') as Element
    messageList.innerHTML = ''
    const div = document.createElement('div')
    div.className = 'messageBac'
    div.innerHTML = `<div class="message">
                        <p>${msg}</p>
                    </div>`
    messageList.appendChild(div)
    setTimeout(() => {
      div.classList.toggle('messageShow')
      setTimeout(() => {
        div.classList.toggle('messageShow')
      }, duration)
    }, 0)
  }
  // 压缩文件
  const zipWorker = (file:File,name:string) =>{
    return new Promise((resolve,reject)=>{
      const worker = new Worker('./js/zip.js')  //复杂的计算,使用web Worker提高性能
      worker.postMessage({file,name})
      worker.onmessage = (e) =>{
        const {name,data} = e.data
        name === 'succee' ? resolve(data) : reject(data)
      }
    })
  }
</script>
<style scoped>
  .page{margin:0 auto;background-color: #28323e;width: 100%;height: 100vh;color:#ffffff;position: relative;}
  .pageTop{height: 48px;padding: 0 48px;display: flex;justify-content: space-between;align-items: center;font-size: 14px;color:#8386be;}
  .pageTop_right{width: 260px;display: flex;}
  .pageTop>p{padding: 12px;}
  .clearBtn{cursor: pointer;color: #853b3c;user-select: none;}
  .clearBtn:hover{cursor: pointer;color: #b65658;}
  .content{max-width: 1000px;margin: 0 auto;overflow-y: auto; height: calc(100vh - 128px);border-radius: 14px;background-color: #303944;border: 1px solid #252f3c;
            box-shadow: 0 0 10px rgba(0, 0, 0, .5) inset;}
  :deep(.el-progress-bar__innerText){color: black;}
  .mybtn{padding: 2px 10px;height: 24px;border-radius: 8px;display: flex;cursor: pointer;margin: 10px 8px;opacity: 0.8;
        display: flex;justify-content: center;align-items: center;user-select: none;min-width: 48px;}
  .mybtn:hover{opacity: 1;}
  .blueBtn{background-color: #409eff;}
  .redBtn{background-color: #f56c6c;}
  .bottomBox{text-align: center;position: absolute;bottom: 0;left: 0;height: 80px;width: 100%;display: flex;align-items: center;}
  .inputBtn>input{position: absolute;top: 0;left: 0;width: 100%;height: 100%;opacity: 0;cursor: pointer;}
  .inputBtn{width: 200px;background-color: #409eff;opacity: 0.8;position: relative;padding: 8px 16px;border-radius: 8px;margin: 0 auto;user-select: none;}
  .inputBtn:hover{opacity: 1;}
  :deep(.messageBac){position: fixed;width: 100%;top:0;left: 0;display: flex;justify-content: center;pointer-events: none;transition: all .3s;transform: translateY(-34px);opacity: 0;}
  :deep(.messageShow){transform: translateY(20px);opacity: 1;}
  :deep(.message){background-color: #c7d1e5;color: #737a88;border-radius: 8px;padding: 4px 16px;}
  /* 滚动条 */
  ::-webkit-scrollbar{width: 6px;height: 6px;}
  ::-webkit-scrollbar-thumb{background-color: #404755;border-radius: 4px;cursor: pointer;}
  ::-webkit-scrollbar-thumb:hover{background-color: #4d5564;}
  @keyframes fadeIn{
  	0% {opacity: 0;}
  	100% {opacity: 1;}
  }
</style>
