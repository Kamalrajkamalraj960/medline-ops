import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { audit } from '../../lib/audit.js';
import { authorize } from '../../middleware/authorize.js';
import { validateBody } from '../../middleware/validate.js';
import {
  createBatchSchema, createCourseSchema, createDemoSchema, createFacultySchema,
  enrollStudentSchema, listCoursesSchema, listSchema, updateBatchSchema, updateCourseSchema,
  updateDemoSchema, updateStudentSchema,
} from './academy.schema.js';
import { academyService } from './academy.service.js';
import { dispatch } from '../automation/automation.engine.js';

const router = Router();

router.get('/stats', authorize('dashboard:view'), asyncHandler(async (_req, res) => {
  res.json(await academyService.stats());
}));

// ---- Courses ----
router.get('/courses', authorize('course:view'), asyncHandler(async (req, res) => {
  res.json(await academyService.listCourses(listCoursesSchema.parse(req.query)));
}));
router.post('/courses', authorize('course:create'), validateBody(createCourseSchema), asyncHandler(async (req, res) => {
  const c = await academyService.createCourse(req.body);
  await audit({ action: 'COURSE_CREATED', resource: 'course', resourceId: c.id, newValue: c, req });
  res.status(201).json(c);
}));
router.patch('/courses/:id', authorize('course:edit'), validateBody(updateCourseSchema), asyncHandler(async (req, res) => {
  const c = await academyService.updateCourse(req.params.id, req.body);
  await audit({ action: 'COURSE_UPDATED', resource: 'course', resourceId: c.id, newValue: req.body, req });
  res.json(c);
}));
router.post('/courses/:id/duplicate', authorize('course:create'), asyncHandler(async (req, res) => {
  const c = await academyService.duplicateCourse(req.params.id);
  await audit({ action: 'COURSE_DUPLICATED', resource: 'course', resourceId: c.id, newValue: { sourceId: req.params.id }, req });
  res.status(201).json(c);
}));
router.delete('/courses/:id', authorize('course:delete'), asyncHandler(async (req, res) => {
  await academyService.deleteCourse(req.params.id);
  await audit({ action: 'COURSE_DELETED', resource: 'course', resourceId: req.params.id, req });
  res.status(204).end();
}));

// ---- Faculty ----
router.get('/faculty', authorize('faculty:view'), asyncHandler(async (_req, res) => {
  res.json(await academyService.listFaculty());
}));
router.post('/faculty', authorize('faculty:manage'), validateBody(createFacultySchema), asyncHandler(async (req, res) => {
  const f = await academyService.createFaculty(req.body);
  await audit({ action: 'FACULTY_CREATED', resource: 'faculty', resourceId: f.id, newValue: f, req });
  res.status(201).json(f);
}));

// ---- Batches ----
router.get('/batches', authorize('batch:view'), asyncHandler(async (_req, res) => {
  res.json(await academyService.listBatches());
}));
router.post('/batches', authorize('batch:create'), validateBody(createBatchSchema), asyncHandler(async (req, res) => {
  const b = await academyService.createBatch(req.body);
  await audit({ action: 'BATCH_CREATED', resource: 'batch', resourceId: b.id, newValue: b, req });
  res.status(201).json(b);
}));
router.patch('/batches/:id', authorize('batch:edit'), validateBody(updateBatchSchema), asyncHandler(async (req, res) => {
  res.json(await academyService.updateBatch(req.params.id, req.body));
}));

// ---- Students ----
router.get('/students', authorize('student:view'), asyncHandler(async (req, res) => {
  res.json(await academyService.listStudents(listSchema.parse(req.query)));
}));
router.post('/students', authorize('student:create'), validateBody(enrollStudentSchema), asyncHandler(async (req, res) => {
  const s = await academyService.enrollStudent(req.body);
  await audit({ action: 'STUDENT_ENROLLED', resource: 'student', resourceId: s.id, newValue: s, req });
  await dispatch('STUDENT_ENROLLED', { studentId: s.id, actorId: req.user!.id }, req);
  res.status(201).json(s);
}));
router.patch('/students/:id', authorize('student:edit'), validateBody(updateStudentSchema), asyncHandler(async (req, res) => {
  const s = await academyService.updateStudent(req.params.id, req.body);
  await audit({ action: 'STUDENT_UPDATED', resource: 'student', resourceId: s.id, newValue: req.body, req });
  res.json(s);
}));

// ---- Demos ----
router.get('/demos', authorize('demo:view'), asyncHandler(async (_req, res) => {
  res.json(await academyService.listDemos());
}));
router.post('/demos', authorize('demo:create'), validateBody(createDemoSchema), asyncHandler(async (req, res) => {
  const d = await academyService.createDemo(req.body);
  await audit({ action: 'DEMO_CREATED', resource: 'demo', resourceId: d.id, newValue: d, req });
  res.status(201).json(d);
}));
router.patch('/demos/:id', authorize('demo:view'), validateBody(updateDemoSchema), asyncHandler(async (req, res) => {
  res.json(await academyService.updateDemo(req.params.id, req.body));
}));

export default router;
