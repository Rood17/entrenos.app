export const brand={name:'EntreNos',tagline:'Un mismo camino, mil planes juntos.',assets:{primary:'/brand/brand-logo-primary.png',light:'/brand/brand-logo-light.png',dark:'/brand/brand-logo-dark.png'}} as const;
export const primitives={terracotta:'#B9604D',terracottaDark:'#873E30',rose:'#F1D3CA',cream:'#FAF3ED',sage:'#648D75',ink:'#322723',white:'#FFFFFF',spacing:4,radius:18} as const;
export type ThemeName='light'|'dark'|'premium';
export const themes={
 light:{background:'#FAF3ED',paper:'#FFF9F5',text:'#322723',muted:'#74665E',primary:'#A94F3E',accent:'#648D75',border:'#E9D9CF'},
 dark:{background:'#201B1B',paper:'#302625',text:'#F8E9DD',muted:'#D7BFB1',primary:'#F1B6A5',accent:'#A8C6AE',border:'#604944'},
 premium:{background:'#F1E8DA',paper:'#FFF9EE',text:'#382A20',muted:'#796954',primary:'#82503B',accent:'#687A54',border:'#D6C4A9'},
} as const;
