import { z } from 'zod';
export declare const authSchemas: {
    register: z.ZodObject<{
        email: z.ZodString;
        username: z.ZodString;
        password: z.ZodString;
        displayName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        username: string;
        password: string;
        displayName?: string | undefined;
    }, {
        email: string;
        username: string;
        password: string;
        displayName?: string | undefined;
    }>;
    login: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
        password: string;
    }, {
        email: string;
        password: string;
    }>;
    forgotPassword: z.ZodObject<{
        email: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
    }, {
        email: string;
    }>;
    resetPassword: z.ZodObject<{
        token: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        token: string;
        password: string;
    }, {
        token: string;
        password: string;
    }>;
};
export declare const userSchemas: {
    updateProfile: z.ZodObject<{
        displayName: z.ZodOptional<z.ZodString>;
        bio: z.ZodOptional<z.ZodString>;
        avatar: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        displayName?: string | undefined;
        avatar?: string | undefined;
        bio?: string | undefined;
    }, {
        displayName?: string | undefined;
        avatar?: string | undefined;
        bio?: string | undefined;
    }>;
    addSocialLink: z.ZodObject<{
        platform: z.ZodEnum<["github", "twitter", "website", "linkedin", "youtube"]>;
        url: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        platform: "github" | "twitter" | "website" | "linkedin" | "youtube";
        url: string;
    }, {
        platform: "github" | "twitter" | "website" | "linkedin" | "youtube";
        url: string;
    }>;
    addTag: z.ZodObject<{
        tag: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        tag: string;
    }, {
        tag: string;
    }>;
};
export declare const agentSchemas: {
    create: z.ZodObject<{
        name: z.ZodString;
        slug: z.ZodString;
        tagline: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        logo: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        demoUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        githubUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        docsUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        categoryId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        slug: string;
        description?: string | undefined;
        logo?: string | undefined;
        tagline?: string | undefined;
        demoUrl?: string | undefined;
        githubUrl?: string | undefined;
        docsUrl?: string | undefined;
        categoryId?: string | undefined;
    }, {
        name: string;
        slug: string;
        description?: string | undefined;
        logo?: string | undefined;
        tagline?: string | undefined;
        demoUrl?: string | undefined;
        githubUrl?: string | undefined;
        docsUrl?: string | undefined;
        categoryId?: string | undefined;
    }>;
    update: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        tagline: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        logo: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        demoUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        githubUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        docsUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        categoryId: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<["draft", "published", "archived"]>>;
    }, "strip", z.ZodTypeAny, {
        name?: string | undefined;
        description?: string | undefined;
        logo?: string | undefined;
        tagline?: string | undefined;
        demoUrl?: string | undefined;
        githubUrl?: string | undefined;
        docsUrl?: string | undefined;
        categoryId?: string | undefined;
        status?: "draft" | "published" | "archived" | undefined;
    }, {
        name?: string | undefined;
        description?: string | undefined;
        logo?: string | undefined;
        tagline?: string | undefined;
        demoUrl?: string | undefined;
        githubUrl?: string | undefined;
        docsUrl?: string | undefined;
        categoryId?: string | undefined;
        status?: "draft" | "published" | "archived" | undefined;
    }>;
    rate: z.ZodObject<{
        overall: z.ZodNumber;
        functionality: z.ZodOptional<z.ZodNumber>;
        usability: z.ZodOptional<z.ZodNumber>;
        documentation: z.ZodOptional<z.ZodNumber>;
        codeQuality: z.ZodOptional<z.ZodNumber>;
        design: z.ZodOptional<z.ZodNumber>;
        comment: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        overall: number;
        functionality?: number | undefined;
        usability?: number | undefined;
        documentation?: number | undefined;
        codeQuality?: number | undefined;
        design?: number | undefined;
        comment?: string | undefined;
    }, {
        overall: number;
        functionality?: number | undefined;
        usability?: number | undefined;
        documentation?: number | undefined;
        codeQuality?: number | undefined;
        design?: number | undefined;
        comment?: string | undefined;
    }>;
};
export declare const postSchemas: {
    create: z.ZodObject<{
        channelId: z.ZodString;
        title: z.ZodString;
        content: z.ZodString;
        type: z.ZodDefault<z.ZodEnum<["normal", "question", "poll", "share"]>>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "normal" | "question" | "poll" | "share";
        channelId: string;
        title: string;
        content: string;
        tags?: string[] | undefined;
    }, {
        channelId: string;
        title: string;
        content: string;
        type?: "normal" | "question" | "poll" | "share" | undefined;
        tags?: string[] | undefined;
    }>;
    update: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        title?: string | undefined;
        content?: string | undefined;
        tags?: string[] | undefined;
    }, {
        title?: string | undefined;
        content?: string | undefined;
        tags?: string[] | undefined;
    }>;
};
export declare const commentSchemas: {
    create: z.ZodObject<{
        content: z.ZodString;
        parentId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        content: string;
        parentId?: string | undefined;
    }, {
        content: string;
        parentId?: string | undefined;
    }>;
    update: z.ZodObject<{
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        content: string;
    }, {
        content: string;
    }>;
};
export declare const paginationSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
}, {
    limit?: number | undefined;
    offset?: number | undefined;
}>;
export declare const idParam: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
//# sourceMappingURL=index.d.ts.map