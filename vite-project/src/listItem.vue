<template>
    <div v-for="item in props.taskArr" :key="item.id">
      <div class="listItem">
        <div class="leftBox">
          <p class="leftBox_fileName">
            {{item.name}}
          </p>
          <div class="leftBox_percentage">
            <div class="percentageBac">
              <div class="percentageBox" :style="{width: `${item.percentage}%`}">
              </div>
              <div class="percentageBox_sapn">
                <span>{{Math.floor(item.percentage)}}%</span>
              </div>
            </div>
            <div class="bottomHint">
              <div>
                 <p>{{fileSize(item.fileSize)}}</p>
              </div>
              <div style="margin-left: 4px;">
                <div v-if="item.state === 0" style="height:24px;width: 100%;"></div>
                <p v-else-if="item.state === 1">文件正在处理中...</p>
                <p v-else-if="item.state === 2">文件正在上传中...</p>
                <p v-else-if="item.state === 3">暂停中</p>
                <p v-else-if="item.state === 4">上传完成</p>
                <p v-else-if="item.state === 5">上传失败</p>
              </div>
            </div>
          </div>
        </div>
        <div class="rightBtn">
          <div class="mybtn redBtn" @click="pauseUpdate(item)" v-if="[1,2].includes(item.state)">暂停</div>
          <div class="mybtn blueBtn" @click="goonUpdate(item)" v-if="[3].includes(item.state)">继续</div>
          <div class="mybtn redBtn" @click="reset(item)">取消</div>
          <!-- <div class="mybtn redBtn" @click="reset(item)" v-if="[2,3,5].includes(item.state)">取消</div> -->
        </div>
      </div>
    </div>
</template>

<script lang="ts" setup>
import { defineProps, defineEmits } from 'vue'
import { taskArrItem } from '@/api/home'
    // 显示到视图层的初始数据:
    const props = defineProps({
        taskArr: Array<taskArrItem>
    })
    const emit = defineEmits(['pauseUpdate', 'goonUpdate', 'reset'])
    // 暂停
    const pauseUpdate = (item:taskArrItem, elsePause = true) => {
        emit('pauseUpdate', item)
    }
    // 继续上传
    const goonUpdate = (item:taskArrItem) => {
        emit('goonUpdate', item)
    }
    // 取消
    const reset = (item:taskArrItem) => {
       emit('reset', item)
    }
    // 显示文件大小
    const fileSize = (val:number) =>{
      let m = 1024 * 1024
      if(val > m){
        let num = Math.floor(val/m)     
        let numB = Math.floor(num/1024)     
        if(numB > 1){
          return `${numB}G`
        }else{
          return `${num}M`
        }
      }else{
        return `${val}KB`
      }
    }
</script>

<style scoped>
  .listItem{margin-bottom: 22px;display: flex;transition: all 1s;}
  .percentageBac{height:24px;width: 100%;border-radius: 8px;background-color: #1b1f24;margin: 10px 0;box-shadow: 0 5px 10px rgba(0, 0, 0, .51) inset;
                  position: relative;overflow: hidden;}
  .percentageBox{height:100%;transition: all .1s;background-color: #73c944;border-radius: 8px;display: flex;justify-content: center;align-items: center;}
  .percentageBox_sapn{position: absolute;top:0;left: 0;width: 100%;display: flex;justify-content: center;font-size: 14px;}
  .leftBox{flex: 1;margin: 10px 0;font-size: 14px;}
  .leftBox_percentage{flex: 1;margin: 0 10px;}
  .leftBox_fileName{margin: 0 10px;font-weight: bold;font-size: 18px;}
  .rightBtn{display: flex;width:130px;font-size: 14px;justify-content: center;align-items: center;}
  .mybtn{padding: 2px 10px;height: 24px;border-radius: 8px;display: flex;cursor: pointer;margin: 10px 8px;opacity: 0.8;
        display: flex;justify-content: center;align-items: center;user-select: none;min-width: 48px;}
  .mybtn:hover{opacity: 1;}
  .blueBtn{background-color: #409eff;}
  .redBtn{background-color: #f56c6c;}
  .bottomHint{opacity: 0.8;display: flex;align-items: center;}
</style>