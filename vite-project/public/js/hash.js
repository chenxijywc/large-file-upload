self.importScripts("spark-md5.min.js")

self.onmessage = async (e) =>{
  let file = e.data.file
  //切片
  let chunkSize = 1024*1024*3  // 每个切片的大小定位3m
  let chunknum = Math.ceil(file.size / chunkSize)  // 切片数量
  let sparkMD5 = new SparkMD5.ArrayBuffer()
  //利用文件首尾分片的md5合并作为整个文件md5
  let firstFile = file.slice(0 * chunkSize, (0 + 1) * chunkSize)
  try{
    if (chunknum === 1) {
      await loadNext(firstFile)
    }else{
      let endFile = file.slice((chunknum-1) * chunkSize, ((chunknum-1) + 1) * chunkSize)
      await loadNext(firstFile)
      await loadNext(endFile)
    }
    let md = sparkMD5.end()
    self.postMessage({name:"succee",data:md})
    self.close()
  }catch(err){
    self.postMessage({name:"error",data:err})
    self.close()
  }
  function loadNext(park){
    return new Promise((resolve,reject)=>{
      let reader = new FileReader()
      reader.readAsArrayBuffer(park)
      reader.onload = (e) => {
        sparkMD5.append(e.target.result)
        resolve()
      }
      reader.onerror = (err) => {
        reject(err)
      }
    })
  }
}