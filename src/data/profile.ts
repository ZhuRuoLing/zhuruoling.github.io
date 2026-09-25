export const siteName = '竹猫的Blog';

/**
 * 站点根 URL（无尾斜杠）。
 * 与 astro.config.mjs 的 `site` 保持一致 —— 这里供 layout 拼接 canonical / og:url 使用。
 */
export const siteUrl = 'https://zhuruoling.github.io';

export const author = 'ZhuRuoLing';

export const bios = [
    '他们说传奇不会飞，我愿意当那个飞物',
    '一只被困在人身体里的猫',
    '这个世界终会有我们存在的地方'
];

export const socialLinks = [
    {label: 'X', href: 'https://x.com/wagakukoharu', icon: '/x.svg'},
    {label: 'Bilibili', href: 'https://space.bilibili.com/408091828', icon: '/bilibili.svg'},
    {label: 'GitHub', href: 'https://github.com/ZhuRuoLing', icon: '/github.svg'},
    {label: 'Telegram', href: 'https://t.me/i_need_more_cats', icon: '/tg.svg'},
];
