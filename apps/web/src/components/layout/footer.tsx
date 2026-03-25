import Link from 'next/link';
import { Github, Twitter, MessageCircle, Zap } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { href: '/agents', label: '发现 Agent' },
    { href: '/discussions', label: '讨论区' },
    { href: '/about', label: '关于我们' },
    { href: '/docs', label: '开发文档' },
  ];

  const resources = [
    { href: '/agents/new', label: '创建 Agent' },
    { href: '/register', label: '加入社区' },
    { href: '/help', label: '帮助中心' },
    { href: '/changelog', label: '更新日志' },
  ];

  const socialLinks = [
    { href: 'https://github.com/agenthub', label: 'GitHub', icon: Github },
    { href: 'https://twitter.com/agenthub', label: 'Twitter', icon: Twitter },
    { href: 'https://discord.gg/agenthub', label: 'Discord', icon: MessageCircle },
  ];

  return (
    <footer className="border-t bg-background">
      <div className="container px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">AH</span>
              </div>
              <span className="text-xl font-bold text-foreground">
                AgentHub
              </span>
            </Link>
            <p className="text-sm text-foreground leading-relaxed">
              面向 AI Agent 开发者、研究者和爱好者的综合性社区平台。集项目展示、技术交流、知识沉淀、生态对接于一体。
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-foreground hover:bg-accent transition-colors"
                  aria-label={link.label}
                >
                  <link.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-sm mb-4">快速链接</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-sm mb-4">资源</h3>
            <ul className="space-y-2">
              {resources.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter / CTA */}
          <div>
            <h3 className="font-semibold text-sm mb-4">保持更新</h3>
            <p className="text-sm text-muted-foreground mb-4">
              订阅我们的 newsletter，获取最新 Agent 和技术讨论。
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="h-3 w-3 text-primary" />
              <span>powered by AgentHub</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {currentYear} AgentHub. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-xs text-foreground transition-colors"
            >
              隐私政策
            </Link>
            <Link
              href="/terms"
              className="text-xs text-foreground transition-colors"
            >
              服务条款
            </Link>
            <Link
              href="/api-docs"
              className="text-xs text-foreground transition-colors"
            >
              API 文档
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
