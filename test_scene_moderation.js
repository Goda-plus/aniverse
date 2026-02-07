const moderationService = require('./api_serve/utils/moderationService');

// 测试名场面自动审核功能
async function testSceneModeration() {
  try {
    console.log('🚀 初始化审核服务...');
    await moderationService.initialize();
    console.log('✅ 审核服务初始化完成\n');

    // 测试1: 正常内容审核
    console.log('🧪 测试1: 审核正常内容');
    const normalContent = {
      title: '经典名场面',
      quote_text: '我是要成为火影的男人！',
      description: '鸣人经典台词，展现了他的决心',
      content_text: '经典名场面 我是要成为火影的男人！ 鸣人经典台词，展现了他的决心',
      user_id: 1,
      submitter_id: 1
    };

    const normalResult = await moderationService.moderateContent(normalContent, 'scene_moment', 1);
    console.log('📊 审核结果:', JSON.stringify(normalResult, null, 2));
    console.log('🎯 预期状态: approved\n');

    // 测试2: 包含敏感词的内容审核
    console.log('🧪 测试2: 审核包含敏感词的内容');
    const sensitiveContent = {
      title: '共产党万岁',
      quote_text: '共产党领导一切！',
      description: '政治宣传内容',
      content_text: '共产党万岁 共产党领导一切！ 政治宣传内容',
      user_id: 1,
      submitter_id: 1
    };

    const sensitiveResult = await moderationService.moderateContent(sensitiveContent, 'scene_moment', 1);
    console.log('📊 审核结果:', JSON.stringify(sensitiveResult, null, 2));
    console.log('🎯 预期状态: pending 或 rejected\n');

    // 测试3: 过长内容审核
    console.log('🧪 测试3: 审核过长内容');
    const longContent = {
      title: '超级长的名场面标题'.repeat(100),
      quote_text: '超级长的台词内容'.repeat(200),
      description: '超级长的描述内容'.repeat(300),
      content_text: '超级长的内容'.repeat(500),
      user_id: 1,
      submitter_id: 1
    };

    const longResult = await moderationService.moderateContent(longContent, 'scene_moment', 1);
    console.log('📊 审核结果:', JSON.stringify(longResult, null, 2));
    console.log('🎯 预期状态: rejected\n');

    console.log('🎉 所有测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testSceneModeration();
