import { Context, Schema,h,Time} from 'koishi'
import { pathToFileURL } from 'url'
import { resolve, join } from 'path'

export const name = 'yulu'

export interface Config {}

export const inject = { 
  required: ['database',], 
  optional: ['assets','blockly'], 
} 

export const Config: Schema<Config> = Schema.object({
  excludeUsers: Schema.array(Schema.object({
    uid: Schema.string().required(),
    note: Schema.string()
  })).default([{ uid: 'red:2854196310', note: 'Q群管家' }])
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
}



export function apply(ctx: Context) {
  ctx.model.extend('yulu', {
    id: 'unsigned',
    content: 'string',
    time: 'timestamp',
    origin_message_id: 'string',
    tags: 'text',
  },{autoInc:true})
  var debugMode = false
  ctx.i18n.define('zh-CN', require('./locales/zh-CN'))
  ctx.command('debug')
  .option('on','-d')
  .option('off','-o')
  .action( ({ options,session })=> {
    if(options.on==true){
      debugMode=true
      return session.text('.debug-on')
    }
    if(options.off==true){
      debugMode=false
      return session.text('.debug-off')
    }
    return session.text('.debug-status',[debugMode])
  })

  ctx.command('yulu_add [...rest]').alias("添加语录")
  .action(async ({session},...rest)=>{
    if(session.quote){
      const content=session.quote.content
      const tags=[]
      var exist=await ctx.database.get('yulu', {content: content,})
      if(exist.length>0){
        session.send(session.text('.already-exist'))
        return exist[0].content
      }
      exist=await ctx.database.get('yulu', {origin_message_id: session.quote.id,})
      if(exist.length>0){
        session.send(session.text('.already-exist'))
        return exist[0].content
      }
      for(var i=0;i<rest.length-1;i++){
        tags.push(rest[i])
      }
      const tag_str=JSON.stringify(tags)
      ctx.database.create('yulu',{content:content,time:new Date(),origin_message_id:session.quote.id,tags:tag_str})
      return session.text('.add-succeed')
    }else{
      return session.text('.no-mes-quoted')
    }
  })
  
  ctx.command('addtag [...rest]')
  .action(async ({session},...rest)=>{
    if(rest.length<=1){
      return session.text('.no-tag-to-add')
    }else{
      if(session.quote){
        var exist=await ctx.database.get('yulu', {origin_message_id: session.quote.id,})
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
          exist=await ctx.database.get('yulu', {content: session.quote.content,})
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
            return session.text('.not-found')
          }
        }
      }else{
        return session.text('.no-mes-quoted')
      }
    }
  })

  ctx.command('removetag [...rest]')
  .action(({session},...rest)=>{
    if(rest.length===0){
      return session.text('.no-tag-to-remove')
    }else{
      
    }
  })

  ctx.command('removeyulu [...rest]').alias("删除语录")
  .action(({session},...rest)=>{
    if(session.quote && session.quote.elements[0].type=="img"){
      if(0){/*发送者没有权限*/
        return session.text('.no-permission-to-remove')
      }else{

      }
    }else{
      return session.text('.no-mes-quoted')
    }
  })

  ctx.command('selectyulu [...rest]').alias("语录")
  .action(async({session},...rest)=>{
    var finds
    if(rest.length==0){
      finds=await ctx.database.get('yulu',{})
    }else{
      finds=await ctx.database.get('yulu',{tags:{$regexFor:"/"+rest[0]+"/"}})
      console.log(rest)
    }
    if(finds.length==0){
      return session.text('.no-result')
    }
    const find=finds[Math.floor(Math.random()*finds.length)]
    return find.content
  })


  ctx.middleware(async (session, next) => {
    if(debugMode && (session.event.user.id=="3783232893" || session.event.user.id=="2479568395")){
      console.log(session.event)
      if(session.quote){
        
      }
      return next()
    }else{
      return next()
    }
  })
}
