self.importScripts("spark-md5.min.js")

self.onmessage = e =>{
  var file = e.data.file
  //切片
  var chunkSize = 1024*1024*3  // 每个切片的大小定位3m
  var chunknum = Math.ceil(file.size / chunkSize)  // 切片数量
  console.log(chunknum,'chunknum')
  var sparkMD5 = new SparkMD5.ArrayBuffer()
  //利用文件首尾分片的md5拼接作为整个文件md5
  for (var i = 0; i < chunknum; i++) {
    var reader = new FileReader()
    var park = file.slice(i * chunkSize, (i + 1) * chunkSize)
    //md5追加计算第一片和最后一片切片
    if (i === 0) {
      reader.readAsArrayBuffer(park)
      reader.onload = (e) => {
        sparkMD5.append(e.target.result.slice(0, 1))
      }
    }
    if (i === chunknum - 1) {
      reader.readAsArrayBuffer(park)
      reader.onload = (e) => {
        sparkMD5.append(e.target.result.slice(0, 1))
        var md = sparkMD5.end()
        self.postMessage({name:"succee",data:md})
        self.close()
      }
    }
  }
  reader.onerror = (err) => {
    self.postMessage({name:"error",data:err})
    self.close()
  }
}