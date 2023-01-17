self.importScripts("spark-md5.min.js")

self.onmessage = e =>{
  let file = e.data.file
  //切片
  let chunkSize = 1024*1024*3  // 每个切片的大小定位3m
  let chunknum = Math.ceil(file.size / chunkSize)  // 切片数量
  let sparkMD5 = new SparkMD5.ArrayBuffer()
  //利用文件首尾分片的md5拼接作为整个文件md5
  for (let i = 0; i < chunknum; i++) {
    let park = file.slice(i * chunkSize, (i + 1) * chunkSize)
    if (i === 0 && chunknum !== 1) {
      loadNext(park)
    }else if (i === chunknum - 1) {
      loadNext(park,()=>{
        let md = sparkMD5.end()
        self.postMessage({name:"succee",data:md})
        self.close()
      })
    }
  }
  function loadNext(park,cd){
    let reader = new FileReader()
    reader.readAsArrayBuffer(park)
    reader.onload = (e) => {
      sparkMD5.append(e.target.result)
      cd ? cd() : ''
    }
    reader.onerror = (err) => {
      self.postMessage({name:"error",data:err})
      self.close()
    }
  }
}