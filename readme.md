# koishi-plugin-yulu

[![npm](https://img.shields.io/npm/v/koishi-plugin-yulu?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-yulu)
[![npm](https://img.shields.io/npm/v/koishi-plugin-yulu-satori?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-yulu-satori)

适用于koishi的语录插件

v0.1.x适用于red适配器
v0.2.x适用于satori适配器


- **指令：yulu_add [...rest]**  
添加一条语录  
别名：添加语录  
准备添加语录，可添加多个tag，用空格隔开。之后由该指令发送者发送的下一张图片将作为语录图片

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
    -l, --list  以文字列表形式显示所有查询到的语录
      -p, --page  指定list结果的页码
      -f, --full  不进行分页，显示所有list的结果
