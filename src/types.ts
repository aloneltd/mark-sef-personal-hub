export type ImageSource =
  | { type: "url"; value: string }
  | { type: "upload"; value: string }
  | { type: "drive"; value: string };

export type SectionType =
  | 'hero'
  | 'split'
  | 'cta'
  | 'grid_cards'
  | 'rich_text'
  | 'logo_strip'
  | 'ai_chat'
  | 'community_form'
  | 'contact_methods'
  | 'media_embed'
  | 'testimonials'
  | 'timeline';

export interface SectionStyleTokens {
  layoutVariant: string;
  surface: "transparent" | "panel" | "card";
  emphasis: "normal" | "highlight";
  density: "tight" | "normal" | "airy";
  width: "standard" | "wide";
  textAlign: "left" | "center" | "right";
  mediaAspect?: "square" | "portrait" | "landscape" | "video" | "original";
}

export interface SectionDefinition {
  id: string;
  type: SectionType;
  enabled: boolean;
  order: number;
  props: Record<string, any>;
  style: SectionStyleTokens;
}

export interface PageLayoutConfig {
  sections: SectionDefinition[];
}

export interface ThemeConfig {
  primaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  headingFont: 'Inter' | 'JetBrains Mono' | 'Georgia' | 'Arial';
  bodyFont: 'Inter' | 'JetBrains Mono' | 'Georgia' | 'Arial';
  cornerRadius: 'none' | 'sm' | 'md' | 'full';
  contrast: number;
  fontSize: number;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  content: string;
  image: ImageSource;
  videoUrl?: string;
  author: string;
  published: boolean;
  sections?: SectionDefinition[];
}

export interface PodcastEpisode {
  id: string;
  title: string;
  slug: string;
  date: string;
  duration: string;
  description: string;
  showNotes: string;
  image: ImageSource;
  mediaType: 'audio' | 'video';
  mediaUrl: string;
  platformLinks: {
    spotify?: string;
    apple?: string;
    youtube?: string;
    rss?: string;
  };
  published: boolean;
  sections?: SectionDefinition[];
}

export interface BlogConfig extends ModuleConfig {
  posts: BlogPost[];
}

export interface PodcastConfig extends ModuleConfig {
  episodes: PodcastEpisode[];
}

export type FormFieldType = 'text' | 'textarea' | 'radio' | 'checklist' | 'select' | 'upload';

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface CommunityMember {
  id: string;
  email: string;
  role: string;
  joinDate: string;
  fields: Record<string, any>;
}

export interface CommunityConfig extends ModuleConfig {
  ctaLabel: string;
  joinDescription: string;
  formFields: FormField[];
  members: CommunityMember[];
}

export interface ContentStore {
  schemaVersion: string;
  brand: BrandConfig;
  theme: ThemeConfig;
  modules: {
    recruiting: ModuleConfig;
    strategy: ModuleConfig;
    community: CommunityConfig;
    blog: BlogConfig;
    podcast: PodcastConfig;
    video: SimpleModule;
    aiConcierge: AIConfig;
  };
  navigation: NavLink[];
  pageLayouts: {
    home: PageLayoutConfig;
    work: PageLayoutConfig;
    about: PageLayoutConfig;
    community: PageLayoutConfig;
    connect: PageLayoutConfig;
    ai: PageLayoutConfig;
    blog: PageLayoutConfig;
    podcast: PageLayoutConfig;
    video: PageLayoutConfig;
  };
}

export interface BrandConfig {
  name: string;
  identityLine: string;
  positioning: string;
  operatorStatement: string;
  heroImage: ImageSource;
  credibilityStrip: string[];
}

export interface ModuleConfig {
  enabled: boolean;
  title: string;
  description: string;
  content: string;
}

export interface AIConfig {
  enabled: boolean;
  floatingChatEnabled: boolean;
  systemInstruction: string;
  guardrails: string;
  knowledgeBase: string;
  voiceEnabled: boolean;
  welcomeMessage: string;
  provider: string;
  model: string;
  maxTokens: number;
  customModels: CustomAIModel[];
  documents: AIDocument[];
  history: Message[];
}

export interface CustomAIModel {
  id: string;
  name: string;
  provider: string;
  costInput: number;
  costOutput: number;
}

export interface AIDocument {
  id: string;
  name: string;
  size: number;
  type: 'pdf' | 'txt';
  date: string;
  content: string;
}

export interface SimpleModule {
  enabled: boolean;
  title: string;
}

export interface NavLink {
  label: string;
  path: string;
  visible: boolean;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}
