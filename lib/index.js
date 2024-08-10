var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/locales/zh-CN.yml
var require_zh_CN = __commonJS({
  "src/locales/zh-CN.yml"(exports, module2) {
    module2.exports = { adminUsers: { $description: "管理员用户" }, dataDir: { $description: "保存图片语录文件的路径" }, pageSize: { $description: "list指令的分页大小" }, "add-succeed": "{0}:添加成功", commands: { yulu_debug: { messages: { "debug-on": "已开启调试模式", "debug-off": "已关闭调试模式", "debug-status": "当前的调试状态为{0}", "no-permission": "权限不足" } }, yulu_test: { messages: { "download-failed": "文件{0}存在错误，正在删除语录" } }, yulu_add: { description: "添加一条语录", usage: "准备添加语录，可添加多个tag，用空格隔开。之后由该指令发送者发送的下一张图片将作为语录图片", messages: { "already-exist": "语录已存在", "add-succeed": "添加成功", "no-mes-quoted": "请引用要添加的语录", "download-failed": "语录{0}下载失败，正在移除", "delete-finish": "语录{0}已删除", "wait-pic": "请上传语录图片：", "pic-in-process": "正在处理图片中，请稍候", "still-in-progress": "您有正在进行的上传会话，发送“取消”终止" } }, yulu_tag_add: { description: "为一条语录增加tag", usage: "为被引用的语录添加tag，多个tag用空格隔开，提示成功添加的tag数量", messages: { "no-tag-to-add": "未输入要添加的tag", "add-succeed": "成功添加{0}个tag", "not-found": "没有找到id为{0}的语录", "no-mes-quoted": "请引用要添加tag的语录" } }, yulu_tag_remove: { description: "为一条语录移除tag", usage: "为被引用的语录移除tag，多个tag用空格隔开，提示成功移除的tag数量", messages: { "no-tag-to-remove": "未输入要移除的tag", "remove-succeed": "成功移除{0}个tag", "no-mes-quoted": "请引用要移除tag的语录", "not-found": "没有找到id为{0}的语录" } }, yulu_remove: { description: "移除被引用的语录", usage: "移除被引用的语录（需要权限，添加平台用户id到adminUsers中获得）", messages: { "no-permission-to-remove": "没有权限移除语录", "no-mes-quoted": "请引用要移除的语录", "not-found": "没有找到id为{0}的语录", "remove-succeed": "成功移除语录" } }, yulu_select: { description: "随机获取一条语录", usage: "随机获取一条语录，参数列表作为要查找的tag", options: { id: "直接通过id索引特定语录", global: "允许选取来自其他群聊的语录", tag: "发送语录时同时发送语录的tag", list: "以文字列表形式显示所有查询到的语录", page: "指定list结果的页码", full: "不进行分页，显示所有list的结果" }, messages: { "no-result": "没有找到符合条件的语录", rest: "第{0}/{1}页，指定-p参数以翻页", "download-failed": "文件{0}存在错误，正在删除语录", "delete-finish": "语录{0}已删除" } } } };
  }
});

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var import_path = require("path");
var import_url = require("url");
var fs = require("fs");
var request = require("request");
async function getfileByUrl(url, fileName, dir) {
  return new Promise((resolve2, reject) => {
    let stream = fs.createWriteStream((0, import_path.join)(dir, fileName));
    request(url).pipe(stream).on("close", (err) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        console.log("语录" + fileName + "下载完毕");
        resolve2(true);
      }
    });
  });
}
__name(getfileByUrl, "getfileByUrl");
async function checkFile(path) {
  return new Promise((resolve2, reject) => {
    fs.stat(path, (err, stats) => {
      if (err) {
        console.error(err);
        reject(err);
      } else {
        if (stats.size < 100) {
          resolve2(false);
        } else {
          resolve2(true);
        }
      }
    });
  });
}
__name(checkFile, "checkFile");
var name = "yulu";
var inject = {
  required: ["database"],
  optional: []
};
var Config = import_koishi.Schema.object({
  adminUsers: import_koishi.Schema.array(import_koishi.Schema.string()).default(["2854196310"]),
  dataDir: import_koishi.Schema.string().default("./data/yulu"),
  pageSize: import_koishi.Schema.number().default(10)
}).i18n({
  "zh-CN": require_zh_CN()
});
function sendYulu(y, p, t) {
  let res = String(y.id) + ":";
  if (t) {
    res = res + y.tags;
  }
  if (y.content.slice(0, 4) == "http" || y.content == "img") {
    const href = (0, import_url.pathToFileURL)((0, import_path.join)((0, import_path.resolve)(p), String(y.id))).href;
    res = res + `<img src="${href}">`;
  } else {
    res = res + y.content;
  }
  return res;
}
__name(sendYulu, "sendYulu");
function apply(ctx, cfg) {
  ctx.model.extend("yulu", {
    id: "unsigned",
    content: "string",
    time: "timestamp",
    origin_message_id: "string",
    tags: "text",
    group: "string"
  }, { autoInc: true });
  ctx.i18n.define("zh-CN", require_zh_CN());
  let debugMode = false;
  ctx.command("yulu/yulu_debug").option("on", "-d").option("off", "-o").action(({ options, session }) => {
    if (!cfg.adminUsers.includes(session.event.user.id)) {
      return session.text(".no-permission");
    }
    if (options.on == true) {
      debugMode = true;
      return session.text(".debug-on");
    }
    if (options.off == true) {
      debugMode = false;
      return session.text(".debug-off");
    }
    return session.text(".debug-status", [debugMode]);
  });
  try {
    if (!fs.existsSync(cfg.dataDir)) {
      fs.mkdirSync(cfg.dataDir);
    }
  } catch (err) {
    console.error(err);
    console.error("请检查文件权限");
  }
  let listeningQueue = [];
  function rmErrYulu(id, session) {
    session.send(session.text(".download-failed", [id]));
    session.execute(`yulu_select -i ${id} -l`);
    console.warn(`语录${id}文件异常，从数据库移除`);
    setTimeout(() => {
      ctx.database.remove("yulu", [id]);
      session.send(session.text(".delete-finish", [id]));
    }, 1e3);
  }
  __name(rmErrYulu, "rmErrYulu");
  let yuluRemove = ctx.command("yulu/yulu_remove [...rest]").alias("删除语录").option("id", "-i <id:number>").action(async ({ session, options }) => {
    if (options.id) {
      if (!cfg.adminUsers.includes(session.event.user.id)) {
        return session.text(".no-permission-to-remove");
      } else {
        const finds = await ctx.database.get("yulu", options.id);
        if (finds.length == 0) {
          return session.text(".no-result");
        }
        ctx.database.remove("yulu", [options.id]);
        return session.text(".remove-succeed");
      }
    } else {
      if (session.quote || session.elements[0].type == "quote") {
        if (!cfg.adminUsers.includes(session.event.user.id)) {
          return session.text(".no-permission-to-remove");
        } else {
          let target;
          try {
            target = Number(session.event.message.elements[0].children[1].attrs.content.split(":")[0]);
          } catch {
            try {
              target = Number(session.quote.content.split(">").at(-1).split(":")[0]);
            } catch {
              return session.text(".no-mes-quoted");
            }
          }
          let exist = await ctx.database.get("yulu", { id: target });
          if (exist.length > 0) {
            ctx.database.remove("yulu", [target]);
            return session.text(".remove-succeed");
          } else {
            return session.text(".not-found", [target]);
          }
        }
      } else {
        return session.text(".no-mes-quoted");
      }
    }
  });
  let yuluAdd = ctx.command("yulu/yulu_add [...rest]").alias("添加语录").action(async ({ session }, ...rest) => {
    for (let listen of listeningQueue) {
      if ((!session.guildId && listen.group == session.event.user.id || session.guildId == listen.group) && session.event.user.id == listen.user && listen.stat == "pending") {
        return session.text(".pic-in-process");
      }
      if ((!session.guildId && listen.group == session.event.user.id || session.guildId == listen.group) && session.event.user.id == listen.user) {
        return session.text(".still-in-progress");
      }
    }
    const tags = [];
    let group;
    if (session.guildId) {
      group = session.guildId;
    } else {
      group = session.userId;
    }
    tags.push(group);
    for (let i = 0; i < rest.length; i++) {
      tags.push(rest[i]);
    }
    const tag_str = JSON.stringify(tags);
    const cont = { time: /* @__PURE__ */ new Date(), origin_message_id: session.event.message.id, group, tags: tag_str };
    listeningQueue.push({ stat: "wait", group, user: session.event.user.id, content: cont });
    return session.text(".wait-pic");
  });
  let yuluTagAdd = ctx.command("yulu/yulu_tag_add [...rest]").alias("addtag").action(async ({ session }, ...rest) => {
    if (rest.length < 1) {
      return session.text(".no-tag-to-add");
    } else {
      if (session.quote || session.elements[0].type == "quote") {
        let target;
        try {
          target = Number(session.event.message.elements[0].children[1].attrs.content.split(":")[0]);
        } catch {
          try {
            target = Number(session.quote.content.split(">").at(-1).split(":")[0]);
          } catch {
            return session.text(".no-mes-quoted");
          }
        }
        if (Number.isNaN(target)) {
          return session.text(".no-mes-quoted");
        }
        let exist = await ctx.database.get("yulu", { id: target });
        if (exist.length > 0) {
          let count = 0;
          const target2 = exist[0].id;
          let tags = JSON.parse(exist[0].tags);
          for (let i = 0; i < rest.length; i++) {
            if (!tags.includes(rest[i])) {
              tags.push(rest[i]);
              count++;
            }
          }
          const tag_str = JSON.stringify(tags);
          ctx.database.set("yulu", target2, { tags: tag_str });
          return session.text(".add-succeed", [count]);
        } else {
          return session.text(".not-found", [target]);
        }
      } else {
        return session.text(".no-mes-quoted");
      }
    }
  });
  let yuluTagRemove = ctx.command("yulu/yulu_tag_remove [...rest]").alias("rmtag").action(async ({ session }, ...rest) => {
    if (rest.length === 0) {
      return session.text(".no-tag-to-remove");
    } else {
      if (session.quote || session.elements[0].type == "quote") {
        let target;
        try {
          target = Number(session.event.message.elements[0].children[1].attrs.content.split(":")[0]);
        } catch {
          try {
            target = Number(session.quote.content.split(">").at(-1).split(":")[0]);
          } catch {
            return session.text(".no-mes-quoted");
          }
        }
        if (Number.isNaN(target)) {
          return session.text(".no-mes-quoted");
        }
        let exist = await ctx.database.get("yulu", { id: target });
        if (exist.length > 0) {
          let count = 0;
          const target2 = exist[0].id;
          let tags = JSON.parse(exist[0].tags);
          tags = tags.filter((tag) => {
            if (rest.includes(tag)) {
              count++;
              return false;
            }
            return true;
          });
          const tag_str = JSON.stringify(tags);
          ctx.database.set("yulu", target2, { tags: tag_str });
          return session.text(".remove-succeed", [count]);
        } else {
          return session.text(".not-found", [target]);
        }
      } else {
        return session.text(".no-mes-quoted");
      }
    }
  });
  ctx.command("yulu/yulu_select [...rest]").alias("语录").option("id", "-i <id:number>").option("global", "-g").option("tag", "-t").option("list", "-l").option("page", "-p <page:number>").option("full", "-f").shortcut("引用语录", { fuzzy: true, options: { global: true } }).action(async ({ session, options }, ...rest) => {
    let finds;
    if (options.id) {
      finds = await ctx.database.get("yulu", options.id);
      if (finds.length == 0) {
        return session.text(".no-result");
      }
      const y = finds[0];
      if (options.list) {
        const res = String(y.id) + ":" + y.tags + "\n";
        return res;
      } else {
        if (!await checkFile((0, import_path.join)(cfg.dataDir, String(options.id)))) {
          rmErrYulu(options.id, session);
          return;
        }
        return sendYulu(y, cfg.dataDir, options.tag);
      }
    } else {
      let group;
      if (session.guildId) {
        group = session.guildId;
      } else {
        group = session.userId;
      }
      let query = ctx.database.select("yulu");
      if (!options.global) {
        query.where({ group: { $eq: group } });
      }
      for (let i = 0; i < rest.length; i++) {
        query.where({ tags: { $regex: rest[i] } });
      }
      finds = await query.execute();
      if (finds.length == 0) {
        return session.text(".no-result");
      }
      if (!options.list) {
        const find = finds[Math.floor(Math.random() * finds.length)];
        if (!await checkFile((0, import_path.join)(cfg.dataDir, String(find.id)))) {
          rmErrYulu(find.id, session);
          return;
        }
        const res = sendYulu(find, cfg.dataDir, options.tag);
        return res;
      } else {
        let page;
        if (!options.page) {
          page = 1;
        } else {
          page = options.page;
        }
        let res = "";
        let i = 0;
        for (i = page * cfg.pageSize - cfg.pageSize; (i < page * cfg.pageSize || options.full) && i < finds.length; i++) {
          const y = finds[i];
          res += String(y.id) + ":" + y.tags + "\n";
        }
        if (i < finds.length) {
          res += session.text(".rest", [page, Math.ceil(finds.length / cfg.pageSize)]);
        }
        return res;
      }
    }
  });
  ctx.middleware(async (session, next) => {
    for (let i = 0; i < session.elements.length; i++) {
      if (session.elements[i].type == "quote") {
        session.execute(session.content.slice(session.content.lastIndexOf(">") + 1));
        break;
      }
    }
    if (listeningQueue.length > 0) {
      if (debugMode) {
        console.log(session.event);
        console.log(session.guildId, session.event.user.id, session.event.message.elements[0].type);
      }
      for (let listen of listeningQueue) {
        if ((!session.guildId && listen.group == session.event.user.id || session.guildId == listen.group) && session.event.user.id == listen.user && listen.stat == "wait") {
          if (session.event.message.elements[0].type == "img") {
            listen.stat = "pending";
            const item = listen.content;
            const src = session.event.message.elements[0].attrs.src;
            const res = await ctx.database.create("yulu", { content: src, time: item.time, origin_message_id: item.origin_message_id, tags: item.tags, group: item.group });
            await getfileByUrl(src, String(res.id), cfg.dataDir);
            if (!await checkFile((0, import_path.join)(cfg.dataDir, String(res.id)))) {
              console.warn(`语录${src}下载失败`);
              async function retry(ms) {
                return new Promise((resolve2, reject) => {
                  setTimeout(async () => {
                    await getfileByUrl(src, String(res.id), cfg.dataDir);
                    resolve2(await checkFile((0, import_path.join)(cfg.dataDir, String(res.id))));
                  }, ms);
                });
              }
              __name(retry, "retry");
              let flag = false;
              for (let i = 0; i < 10; i++) {
                console.log(`下载失败，第${i + 1}次重试`);
                if (await retry(2e3)) {
                  flag = true;
                  console.log(`下载成功`);
                  break;
                }
              }
              if (!flag) {
                console.log(`重试次数达上限`);
                rmErrYulu(res.id, session);
                return;
              }
            }
            await ctx.database.set("yulu", res.id, { origin_message_id: session.event.message.id });
            session.send(session.text("add-succeed", [res.id]));
            listen.stat = "finished";
            break;
          } else if (session.event.message.content == "取消") {
            listen.stat = "finished";
            break;
          }
        }
      }
      listeningQueue = listeningQueue.filter((item) => {
        return item.stat != "finished";
      });
    }
    if (debugMode) {
      try {
        console.log(JSON.stringify(session.event, null, "  "));
        return next();
      } catch (error) {
        console.log(error);
        return next();
      }
    }
    return next();
  });
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name
});
