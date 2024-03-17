import { Session, Context, Schema } from 'koishi'
import { join, resolve } from 'path';
import { pathToFileURL } from 'url'
let fs = require("fs");
let request = require("request");

async function getfileByUrl(url, fileName, dir) {
  var res = new Promise((resolve, reject) => {
    let stream = fs.createWriteStream(join(dir, fileName));
    request(url).pipe(stream).on("close", (err) => {
      if (err) {
        console.error(err);
        reject(err)
      } else {
        console.log("语录" + fileName + "下载完毕");
        resolve(true)
      }
    });
  })
  return res
}

export const name = 'yulu'

export interface Config {
  dataDir: string
  adminUsers: string[]
  pageSize: number
}

export const inject = {
  required: ['database'],
  optional: [],
}

export const Config: Schema<Config> = Schema.object({
  adminUsers: Schema.array(Schema.string()).default(['2854196310']),
  dataDir: Schema.string().default("./data/yulu"),
  pageSize: Schema.number().default(10)
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

function sendYulu(y: Yulu, p: string, t: boolean): string {
  var res: string = String(y.id) + ":"
  if (t) {
    res = res + y.tags
  }
  if (y.content == "img") {
    const href = pathToFileURL(join(resolve(p), String(y.id))).href
    res = res + `<img src="${href}">`
  } else {
    res = res + y.content
  }
  return res
}

export function apply(ctx: Context, cfg: Config) {
  ctx.model.extend('yulu', {
    id: 'unsigned',
    content: 'string',
    time: 'timestamp',
    origin_message_id: 'string',
    tags: 'text',
    group: 'string'
  }, { autoInc: true })

  var debugMode = false

  ctx.command('yulu/yulu_debug')
    .option('on', '-d')
    .option('off', '-o')
    .action(({ options, session }) => {
      if (!cfg.adminUsers.includes(session.event.user.id)) {
        return session.text('.no-permission')
      }
      if (options.on == true) {
        debugMode = true
        return session.text('.debug-on')
      }
      if (options.off == true) {
        debugMode = false
        return session.text('.debug-off')
      }
      return session.text('.debug-status', [debugMode])
    })

  ctx.i18n.define('zh-CN', require('./locales/zh-CN'))

  var pageSize = cfg.pageSize

  try {
    if (!fs.existsSync(cfg.dataDir)) {
      fs.mkdirSync(cfg.dataDir)
    }
  } catch (err) {
    console.error(err)
    console.error("请检查文件权限")
  }

  async function checkFile(id: number, session: Session) {
    var res = await new Promise((resolve, reject) => {
      fs.stat(join(cfg.dataDir, String(id)), (err, stats) => {
        if (err) {
          console.error(err)
          reject(err)
        } else {
          if (stats.size < 100) {
            session.send(session.text('.download-failed', [id]))
            session.execute(`yulu_select -i ${id} -l`)
            setTimeout(() => {
              ctx.database.remove('yulu', [id])
              session.send(session.text('.delete-finish', [id]))
            }, 1000)
            resolve(false)
          } else {
            resolve(true)
          }
        }
      })
    })
    return res
  }

  var yuluRemove = ctx.command('yulu/yulu_remove [...rest]').alias("删除语录")
    .option('id', '-i <id:number>')
    .action(async ({ session, options }) => {
      if (options.id) {
        if (!cfg.adminUsers.includes(session.event.user.id)) {
          return session.text('.no-permission-to-remove')
        } else {
          const finds = await ctx.database.get('yulu', options.id)
          if (finds.length == 0) {
            return session.text('.no-result')
          }
          ctx.database.remove('yulu', [options.id])
          return session.text('.remove-succeed')
        }
      } else {
        if (session.quote) {
          if (!cfg.adminUsers.includes(session.event.user.id)) {
            return session.text('.no-permission-to-remove')
          } else {
            var exist = await ctx.database.get('yulu', { origin_message_id: session.quote.id, })
            if (exist.length > 0) {//如果引用的是语录的原始消息
              ctx.database.remove('yulu', [exist[0].id])
              return session.text('.remove-succeed')
            }
            try {
              var target = Number(session.quote.content.split(':')[0])
            } catch {
              return session.text('.no-mes-quoted')
            }
            exist = await ctx.database.get('yulu', { id: target, })
            if (exist.length > 0) {
              ctx.database.remove('yulu', [target])
              return session.text('.remove-succeed')
            } else {
              return session.text('.not-found', [target])
            }
          }
        } else {
          return session.text('.no-mes-quoted')
        }
      }
    })

  var yuluAdd = ctx.command('yulu/yulu_add [...rest]').alias("添加语录")
    .action(async ({ session }, ...rest) => {
      if (session.quote) {
        const content = session.quote.content
        const tags = []
        var group
        if (session.guildId) {
          tags.push(String(session.guildId))
          group = session.guildId
        } else {
          group = session.userId
        }
        var exist = await ctx.database.get('yulu', { content: { $eq: content }, })//搜索是否存在内容相同的语录（涉及到图片时有bug,明明数据库内容完全一致但还是重复，难道是太长了？）
        if (exist.length > 0) {
          session.send(session.text('.already-exist'))
          return sendYulu(exist[0], cfg.dataDir, true)
        }
        exist = await ctx.database.get('yulu', { origin_message_id: session.quote.id, })//根据消息id搜索是否存在相同的语录，即判断该条消息是否已经被添加过
        if (exist.length > 0) {
          session.send(session.text('.already-exist'))
          return sendYulu(exist[0], cfg.dataDir, true)
        }
        for (var i = 0; i < rest.length - 1; i++) {//由于rest会把引用的内容也加入 这里要-1 感觉可能出bug
          tags.push(rest[i])
        }
        const tag_str = JSON.stringify(tags)
        var result = await ctx.database.create('yulu', { content: content, time: new Date(), origin_message_id: session.quote.id, group: group, tags: tag_str })
        if (session.quote.elements[0].type == "img") {//语录为图片
          if (debugMode) { console.log(String(session.quote.elements[0].attrs.src)) }
          await getfileByUrl(session.quote.elements[0].attrs.src, String(result.id), cfg.dataDir)//下载图片到本地路径
          if (!await checkFile(result.id, session)) {//语录文件下载失败
            return
          }
          await ctx.database.set('yulu', result.id, { content: "img" })//替换数据库中的内容为图片标识，发送时根据id查找图片文件
        }
        return session.text('.add-succeed')
      } else {
        return session.text('.no-mes-quoted')
      }
    })

  var yuluTagAdd = ctx.command('yulu/yulu_tag_add [...rest]').alias("addtag")
    .action(async ({ session }, ...rest) => {
      if (rest.length <= 1) {
        return session.text('.no-tag-to-add')
      } else {
        if (session.quote) {
          var exist = await ctx.database.get('yulu', { origin_message_id: session.quote.id, })
          if (exist.length > 0) {//如果引用的是语录的原始消息
            var count: number = 0
            const target = exist[0].id
            var tags = JSON.parse(exist[0].tags)
            for (var i = 0; i < rest.length - 1; i++) {
              if (!tags.includes(rest[i])) {
                tags.push(rest[i])
                count++
              }
            }
            const tag_str = JSON.stringify(tags)
            ctx.database.set('yulu', target, { tags: tag_str })
            return session.text('.add-succeed', [count])
          } else {//解析消息获得id来定位语录
            try {
              var target = Number(session.quote.content.split(':')[0])
            } catch {
              return session.text('.no-mes-quoted')
            }
            exist = await ctx.database.get('yulu', { id: target, })
            if (exist.length > 0) {
              var count: number = 0
              const target = exist[0].id
              var tags = JSON.parse(exist[0].tags)
              for (var i = 0; i < rest.length - 1; i++) {
                if (!tags.includes(rest[i])) {
                  tags.push(rest[i])
                  count++
                }
              }
              const tag_str = JSON.stringify(tags)
              ctx.database.set('yulu', target, { tags: tag_str })
              return session.text('.add-succeed', [count])
            } else {
              return session.text('.not-found', [target])
            }
          }
        } else {
          return session.text('.no-mes-quoted')
        }
      }
    })

  var yuluTagAdd = ctx.command('yulu/yulu_tag_remove [...rest]').alias("rmtag")
    .action(async ({ session }, ...rest) => {
      if (rest.length === 0) {
        return session.text('.no-tag-to-remove')
      } else {
        if (session.quote) {
          try {
            var target = Number(session.quote.content.split(':')[0])
          } catch {
            return session.text('.no-mes-quoted')
          }
          var exist = await ctx.database.get('yulu', { id: target, })
          if (exist.length > 0) {
            var count: number = 0
            const target = exist[0].id
            var tags: string[] = JSON.parse(exist[0].tags)
            tags = tags.filter(tag => { //去除tags中所有在rest中的项
              if (rest.includes(tag)) {
                count++
                return false
              }
              return true
            })
            const tag_str = JSON.stringify(tags)
            ctx.database.set('yulu', target, { tags: tag_str })
            return session.text('.remove-succeed', [count])
          } else {
            return session.text('.not-found', [target])
          }
        } else {
          return session.text('.no-mes-quoted')
        }
      }
    })

  var yuluSelect = ctx.command('yulu/yulu_select [...rest]').alias("语录")
    .option('id', '-i <id:number>')
    .option('global', '-g')
    .option('tag', '-t')
    .option('list', '-l').option('page', '-p <page:number>').option('full', '-f')
    .shortcut('引用语录', { fuzzy: true, options: { global: true } })
    .action(async ({ session, options }, ...rest) => {
      var finds: Yulu[]
      if (options.id) {
        finds = await ctx.database.get('yulu', options.id)
        if (finds.length == 0) {
          return session.text('.no-result')
        }
        const y = finds[0]
        if (options.list) {
          var res = String(y.id) + ":" + y.tags + "\n"
          return res
        } else {
          if (!await checkFile(options.id, session)) {//语录文件下载失败
            return
          }
          return sendYulu(y, cfg.dataDir, options.tag)
        }
      } else {
        var group: string
        if (session.guildId) {
          group = session.guildId
        } else {
          group = session.userId
        }
        var query = ctx.database.select('yulu')
        if (!options.global) {
          query.where({ group: { $eq: group } })
        }
        for (var i = 0; i < rest.length; i++) {
          query.where({ tags: { $regex: rest[i] } })
        }
        finds = await query.execute()
        if (finds.length == 0) {
          return session.text('.no-result')
        }
        if (!options.list) {
          const find = finds[Math.floor(Math.random() * finds.length)]
          if (!await checkFile(find.id, session)) {//语录文件下载失败
            return
          }
          const res = sendYulu(find, cfg.dataDir, options.tag)
          return res
        } else {
          var page: number
          if (!options.page) {
            page = 1
          } else {
            page = options.page
          }
          var res: string = ""
          var i = 0;
          for (i = page * pageSize - pageSize; (i < page * pageSize || options.full) && i < finds.length; i++) {
            const y = finds[i]
            res += String(y.id) + ":" + y.tags + "\n"
          }
          if (i < finds.length) {
            res += session.text('.rest', [finds.length - i])
          }
          return res
        }
      }
    })

  ctx.middleware(async (session, next) => {
    if (debugMode) {
      console.log(session.event)
      console.log(session.elements)
      session.send("event:\n" + JSON.stringify(session.event))
      if (session.quote) {
        session.send("quote:\n" + JSON.stringify(session.quote))
        console.log(session.quote)
        console.log(session.quote.elements)
      }
      return next()
    } else {
      return next()
    }
  })
}
