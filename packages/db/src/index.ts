import { libsql, db, schema, initializeDatabase } from './client.js';
import type { 
  AgentCategory, 
  Article, ArticleCategory, ArticleSeries,
  Resource, ResourceCategory,
  Activity, ActivityRegistration,
  User, UserSocialLink, UserTag,
  Post, PostTag,
  Comment, 
  Notification, 
  Conversation, Message,
  Agent, AgentTag, AgentScreenshot, AgentVersion, AgentRating, AgentComment,
  Channel,
  UserFeedback,
  // New types
  NewUser, NewAgent, NewPost, NewComment,
  NewMessage, NewConversation,
  NewAgentTag, NewAgentScreenshot, NewAgentVersion, NewAgentRating,
  NewUserSocialLink, NewUserTag, NewPostTag
} from './schema.js';

export { libsql, db, schema, initializeDatabase };
export type { 
  AgentCategory, 
  Article, ArticleCategory, ArticleSeries,
  Resource, ResourceCategory,
  Activity, ActivityRegistration,
  User, UserSocialLink, UserTag,
  Post, PostTag,
  Comment, 
  Notification, 
  Conversation, Message,
  Agent, AgentTag, AgentScreenshot, AgentVersion, AgentRating, AgentComment,
  Channel,
  UserFeedback,
  // New types
  NewUser, NewAgent, NewPost, NewComment,
  NewMessage, NewConversation,
  NewAgentTag, NewAgentScreenshot, NewAgentVersion, NewAgentRating,
  NewUserSocialLink, NewUserTag, NewPostTag
};