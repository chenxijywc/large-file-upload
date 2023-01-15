import { createApp } from 'vue'
import '@/global.css'
import App from '@/App.vue'
import localforage from "localforage"
// localforage.config({ name: 'db' })
var otherStore = localforage.createInstance({
    name: "db"
  });

const app = createApp(App)
app.config.globalProperties.$localForage = otherStore

app.mount('#app')

