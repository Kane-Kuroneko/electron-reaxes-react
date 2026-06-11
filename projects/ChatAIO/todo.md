- [ ] 修改打开外链的逻辑,要判断一下如果是同域的链接则不用shell打开而是本地跳转
- [ ] 全局代理和每个ai单独的代理并存,ai代理优先级高于全局代理
- [ ] Tray
- [ ] I18n + Language Setting
- [ ]
- [ ] 快捷键=>
  - [ ] ctrl+[]切换ai
    - [ ] 在UI左上和右上角显示左右AIname,也显示当前的AIname
  - [ ] 快捷键呼出窗口
  - [ ] 
- [ ] 

---

Main:
- send:
  - webContents.send
- listen
  - ipcMain.on 
  - ipcMain.handle

Renderer:
- send:
  - webContents.send(channel, data)
  - webContents.sendToFrame(frameId, channel, data)
- listen:
  - ipcRenderer.on(channel, listener)
  - ipcRenderer.once(channel, listener) 
