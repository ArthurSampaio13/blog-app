import type { Response, Express } from 'express';
import express from 'express';

import type { ApiRequest  } from '../utils.js';
import { buildHandler } from '../utils.js';

import {
    resolveBlogLinkMiddleware,
    trySetUserMiddleware
} from '../../core/middleware.js';

const router = express.Router();

async function getPostHandler(
    req: ApiRequest,
    res: Response
) : Promise<void> {
    if (!req.ctx || !req.account) {
        throw new Error('erro ao pegar post')
    }

    const blogPost = await req.ctx
        .blog
        .getPostById(req.account.id, req.params.postId);

    res.status(200).json({ ok: true, ...blogPost });
}

router.get('/post/:postId', buildHandler(getPostHandler));

export default function makeEndpoint (app: Express) {
    app.use(
        '/blog/:blogLink',
        trySetUserMiddleware,
        resolveBlogLinkMiddleware,
        router
    );
}