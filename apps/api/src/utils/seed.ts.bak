import { db, schema } from '@agenthub/db';
import { nanoid } from 'nanoid';

/**
 * Seed script to initialize agent categories
 */

const categories = [
  {
    name: '对话助手',
    slug: 'conversational',
    description: '智能对话助手、聊天机器人、语音助手',
    icon: 'message-circle',
  },
  {
    name: '代码工具',
    slug: 'code-tools',
    description: '代码生成、代码审查、编程辅助工具',
    icon: 'code',
  },
  {
    name: '数据分析',
    slug: 'data-analysis',
    description: '数据处理、统计分析、可视化工具',
    icon: 'bar-chart',
  },
  {
    name: '创意生成',
    slug: 'creative',
    description: '文案创作、图像生成、音乐创作、设计辅助',
    icon: 'sparkles',
  },
  {
    name: '自动化',
    slug: 'automation',
    description: '工作流自动化、任务调度、RPA 工具',
    icon: 'workflow',
  },
  {
    name: '教育',
    slug: 'education',
    description: '学习辅导、语言教育、在线答疑',
    icon: 'graduation-cap',
  },
  {
    name: '游戏',
    slug: 'gaming',
    description: '游戏AI、NPC、关卡生成、游戏辅助',
    icon: 'gamepad',
  },
  {
    name: '其他',
    slug: 'other',
    description: '其他类型的 AI Agent',
    icon: 'apps',
  },
];

async function seedCategories() {
  console.log('🌱 Seeding agent categories...');

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    
    // Check if already exists
    const existing = await db.select()
      .from(schema.agentCategories)
      .where(eq(schema.agentCategories.slug, cat.slug))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  ✓ ${cat.name} already exists`);
      continue;
    }

    await db.insert(schema.agentCategories).values({
      id: nanoid(),
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon,
      sortOrder: i,
    });

    console.log(`  ✓ Created: ${cat.name}`);
  }

  console.log('✅ Categories seeded successfully');
}

async function seedChannels() {
  console.log('🌱 Seeding discussion channels...');

  const channels = [
    {
      name: '综合讨论',
      slug: 'general',
      description: '关于 AI Agent 的综合性讨论',
      icon: 'message-square',
      type: 'public',
      isDefault: true,
    },
    {
      name: '技术分享',
      slug: 'tech',
      description: '技术实现、架构设计、经验分享',
      icon: 'code',
      type: 'public',
      isDefault: false,
    },
    {
      name: '求助问答',
      slug: 'qna',
      description: '遇到问题？在这里寻求帮助',
      icon: 'help-circle',
      type: 'public',
      isDefault: false,
    },
    {
      name: 'Agent 展示',
      slug: 'showcase',
      description: '展示你开发的 AI Agent 项目',
      icon: 'rocket',
      type: 'public',
      isDefault: false,
    },
    {
      name: '行业资讯',
      slug: 'news',
      description: 'AI Agent 行业最新动态和资讯',
      icon: 'newspaper',
      type: 'public',
      isDefault: false,
    },
    {
      name: '灌水闲聊',
      slug: 'chat',
      description: '轻松聊天，畅所欲言',
      icon: 'coffee',
      type: 'public',
      isDefault: false,
    },
  ];

  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i];

    // Check if already exists
    const existing = await db.select()
      .from(schema.channels)
      .where(eq(schema.channels.slug, channel.slug))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  ✓ ${channel.name} already exists`);
      continue;
    }

    await db.insert(schema.channels).values({
      id: nanoid(),
      name: channel.name,
      slug: channel.slug,
      description: channel.description,
      icon: channel.icon,
      type: channel.type,
      isDefault: channel.isDefault,
      sortOrder: i,
    });

    console.log(`  ✓ Created: ${channel.name}`);
  }

  console.log('✅ Channels seeded successfully');
}

// Import eq for the query
import { eq } from 'drizzle-orm';

async function main() {
  try {
    await seedCategories();
    await seedChannels();
    console.log('\n🎉 All seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
