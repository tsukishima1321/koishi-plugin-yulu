import { Context, Schema} from 'koishi'
import { join, resolve } from 'path';
import { pathToFileURL } from 'url'
let fs = require("fs");
let request = require("request");

function getfileByUrl(url,fileName,dir){
  let stream = fs.createWriteStream(join(dir, fileName));
  request(url).pipe(stream).on("close", function (err) {
      console.log("语录" + fileName + "下载完毕");
  });
}

export const name = 'yulu'

export interface Config {
  dataDir:string
  adminUsers: string[]
}

export const inject = { 
  required: ['database'], 
  optional: [], 
} 

export const Config: Schema<Config> = Schema.object({
  adminUsers: Schema.array(Schema.string()).default(['2854196310']),
  dataDir: Schema.string().default("./data/yulu")
}).i18n({
  'zh-CN': require('./locales/zh-CN'),
})

declare module 'koishi' {
  interface Tables {
    yulu: Yulu
  }
}

export interface Yulu {
  id: number
  content: string
  time: Date
  origin_message_id: string
  tags: string
  group: string
}

function sendYulu(y:Yulu,p:string,t:boolean): string{
  var res:string=String(y.id)+":"
  if(t){
    res=res+y.tags
  }
  if(y.content=="img"){
    const href=pathToFileURL(join(resolve(p),String(y.id))).href
    res=res+`<img src="${href}">`
  }else{
    res=res+y.content
  }
  return res
}


export function apply(ctx: Context,cfg: Config) {
  ctx.model.extend('yulu', {
    id: 'unsigned',
    content: 'string',
    time: 'timestamp',
    origin_message_id: 'string',
    tags: 'text',
    group: 'string'
  },{autoInc:true})

  ctx.i18n.define('zh-CN', require('./locales/zh-CN'))

  try {
    if (!fs.existsSync(cfg.dataDir)) {
      fs.mkdirSync(cfg.dataDir)
    }
  } catch (err) {
    console.error(err)
    console.error("请检查文件权限")
  }

  ctx.command('yulu/yulu_add [...rest]').alias("添加语录")
  .action(async ({session},...rest)=>{
    if(session.quote){
      const content=session.quote.content
      const tags=[]
      var group
      if(session.guildId){
        tags.push(String(session.guildId))
        group=session.guildId
      }else{
        group=session.userId
      }
      var exist=await ctx.database.get('yulu', {content: {$eq:content},})//搜索是否存在内容相同的语录（涉及到图片时有bug,明明数据库内容完全一致但还是重复，难道是太长了？）
      if(exist.length>0){
        session.send(session.text('.already-exist'))
        return sendYulu(exist[0],cfg.dataDir,true)
      }
      exist=await ctx.database.get('yulu', {origin_message_id: session.quote.id,})//根据消息id搜索是否存在相同的语录，即判断该条消息是否已经被添加过
      if(exist.length>0){
        session.send(session.text('.already-exist'))
        return sendYulu(exist[0],cfg.dataDir,true)
      }
      for(var i=0;i<rest.length-1;i++){//由于rest会把引用的内容也加入 这里要-1 感觉可能出bug
        tags.push(rest[i])
      }
      const tag_str=JSON.stringify(tags)
      var result=await ctx.database.create('yulu',{content:content,time:new Date(),origin_message_id:session.quote.id,group:group,tags:tag_str})
      if(session.quote.elements[0].type=="img"){//语录为图片
        getfileByUrl(session.quote.elements[0].attrs.src,String(result.id),cfg.dataDir)//下载图片到本地路径
        const local=pathToFileURL(join(resolve(cfg.dataDir),String(result.id)))
        await ctx.database.set('yulu', result.id, {content: "img"})//替换数据库中的内容为图片标识，发送时根据id查找图片文件
      }
      return session.text('.add-succeed')
    }else{
      return session.text('.no-mes-quoted')
    }
  })
  
  ctx.command('yulu/yulu_tag_add [...rest]').alias("addtag")
  .action(async ({session},...rest)=>{
    if(rest.length<=1){
      return session.text('.no-tag-to-add')
    }else{
      if(session.quote){
        var exist=await ctx.database.get('yulu', {origin_message_id: session.quote.id,})
        if(exist.length>0){//如果引用的是语录的原始消息
          var count:number=0
          const target=exist[0].id
          var tags=JSON.parse(exist[0].tags)
          for(var i=0;i<rest.length-1;i++){
            if(!tags.includes(rest[i])){
              tags.push(rest[i])
              count++
            }
          }
          const tag_str=JSON.stringify(tags)
          ctx.database.set('yulu',target,{tags:tag_str})
          return session.text('.add-succeed',[count])
        }else{//解析消息获得id来定位语录
          var target=Number(session.quote.content.split(':')[0])
          exist=await ctx.database.get('yulu',  {id: target,})
          if(exist.length>0){
            var count:number=0
            const target=exist[0].id
            var tags=JSON.parse(exist[0].tags)
            for(var i=0;i<rest.length-1;i++){
              if(!tags.includes(rest[i])){
                tags.push(rest[i])
                count++
              }
            }
            const tag_str=JSON.stringify(tags)
            ctx.database.set('yulu',target,{tags:tag_str})
            return session.text('.add-succeed',[count])
          }else{
            return session.text('.not-found',[target])
          }
        }
      }else{
        return session.text('.no-mes-quoted')
      }
    }
  })

  ctx.command('yulu/yulu_tag_remove [...rest]').alias("rmtag")
  .action(async({session},...rest)=>{
    if(rest.length===0){
      return session.text('.no-tag-to-remove')
    }else{
      if(session.quote){
        var target=Number(session.quote.content.split(':')[0])
        var exist=await ctx.database.get('yulu',  {id: target,})
        if(exist.length>0){
          var count:number=0
          const target=exist[0].id
          var tags:string[]=JSON.parse(exist[0].tags)
          tags=tags.filter(tag=>{ //去除tags中所有在rest中的项
            if(rest.includes(tag)){
              count++
              return false
            }
            return true
          })
          const tag_str=JSON.stringify(tags)
          ctx.database.set('yulu',target,{tags:tag_str})
          return session.text('.remove-succeed',[count])
        }else{
          return session.text('.not-found',[target])
        }
      }else{
        return session.text('.no-mes-quoted')
      }
    }
  })

  ctx.command('yulu/yulu_remove [...rest]').alias("删除语录")
  .action(async({session},...rest)=>{
    if(session.quote){
      if(!cfg.adminUsers.includes(session.event.user.id)){/*发送者没有权限*/
        return session.text('.no-permission-to-remove')
      }else{
        var target=Number(session.quote.content.split(':')[0])
        var exist=await ctx.database.get('yulu',  {id: target,})
        if(exist.length>0){
          ctx.database.remove('yulu',[target])
          return session.text('.remove-succeed')
        }else{
          return session.text('.not-found',[target])
        }
      }
    }else{
      return session.text('.no-mes-quoted')
    }
  })

  ctx.command('yulu/yulu_select [...rest]').alias("语录")
  .option('id','-i')
  .option('global','-g')
  .option('tag','-t')
  .shortcut('引用语录',{fuzzy:true,options:{global:true}})
  .action(async({session,options},...rest)=>{
    if(options.id){
      const target=rest[0]
      finds=await ctx.database.get('yulu',target)
      if(finds.length==0){
        return session.text('.no-result')
      }
      return sendYulu(finds[0],cfg.dataDir,options.tag)
    }else{
      var group
      if(session.guildId){
        group=session.guildId
      }else{
        group=session.userId
      }
      var finds
      if(rest.length==0){
        if(options.global){
          finds=await ctx.database.get('yulu',{})
        }else{
          finds=await ctx.database.get('yulu',{group:{$eq:group}})
        }
      }else{
        if(options.global){
          finds=await ctx.database.get('yulu',{tags:{$regexFor:"/"+rest[0]+"/"}})
        }else{
          finds=await ctx.database.get('yulu',{tags:{$regexFor:"/"+rest[0]+"/"},group:{$eq:group}})
        }
      }
      if(finds.length==0){
        return session.text('.no-result')
      }
      const find=finds[Math.floor(Math.random()*finds.length)]
      return sendYulu(find,cfg.dataDir,options.tag)
    }
  })
}
