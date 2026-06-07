import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { audit } from '../../lib/audit.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validateBody } from '../../middleware/validate.js';
import { loginSchema, refreshSchema } from './auth.schema.js';
import { authService } from './auth.service.js';

const router = Router();

router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;
    const result = await authService.login(identifier, password, {
      userAgent: req.get('user-agent') ?? undefined,
      ip: req.ip,
    });
    await audit({ actorId: result.user.id, action: 'LOGIN', resource: 'auth', resourceId: result.user.id, req });
    res.json(result);
  }),
);

router.post(
  '/refresh',
  validateBody(refreshSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.refresh(req.body.refreshToken);
    res.json(result);
  }),
);

router.post(
  '/logout',
  validateBody(refreshSchema),
  asyncHandler(async (req, res) => {
    await authService.logout(req.body.refreshToken);
    res.json({ success: true });
  }),
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await authService.me(req.user!.id);
    res.json({ user });
  }),
);

export default router;
