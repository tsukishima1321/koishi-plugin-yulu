# koishi-plugin-yulu

[![npm](https://img.shields.io/npm/v/koishi-plugin-yulu?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-yulu)

适用于koishi的语录插件

- **指令：yulu_add [...rest]**  
添加一条语录  
别名：添加语录  
引用一条消息作为要添加的语录，可添加多个tag，用空格隔开。图片等非文本消息需要在插件启动后发出的才能被引用，转发的消息可能无法被引用  

- **指令：yulu_remove**  
移除被引用的语录  
别名：删除语录  
移除被引用的语录（需要权限，添加平台用户id到adminUsers中获得）   

- **指令：yulu_tag_add [...rest]**  
为一条语录增加tag  
别名：addtag  
为被引用的语录添加tag，多个tag用空格隔开，提示成功添加的tag数量  

- **指令：yulu_tag_remove [...rest]**  
为一条语录移除tag  
别名：rmtag  
为被引用的语录移除tag，多个tag用空格隔开，提示成功移除的tag数量  

- **指令：yulu_select [...rest]**  
随机获取一条语录  
别名：语录  
随机获取一条语录，参数列表作为要查找的tag
可用的选项有：  
    -i, --id  直接通过id索引特定语录  
    -g, --global  允许选取来自其他群聊的语录  
    -t, --tag  发送语录时同时发送语录的tag  
