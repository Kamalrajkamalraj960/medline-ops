import { prisma, type Prisma } from '@medline/db';
import { HttpError } from '../../lib/http-error.js';
import type {
  CreateBatchInput, CreateCourseInput, CreateDemoInput, CreateFacultyInput,
  EnrollStudentInput, ListCoursesInput, ListInput, UpdateBatchInput, UpdateCourseInput,
  UpdateDemoInput, UpdateStudentInput,
} from './academy.schema.js';

function seq(prefix: string, current: string | null): string {
  const lastVal = current ? Number(current.slice(prefix.length)) : 0;
  return `${prefix}${String(lastVal + 1).padStart(4, '0')}`;
}

async function nextStudentRef(): Promise<string> {
  const prefix = `ST-${new Date().getUTCFullYear()}-`;
  const last = await prisma.academyStudent.findFirst({
    where: { reference: { startsWith: prefix } },
    orderBy: { reference: 'desc' },
    select: { reference: true },
  });
  return seq(prefix, last?.reference ?? null);
}

async function nextBatchCode(): Promise<string> {
  const prefix = `BT-${new Date().getUTCFullYear()}-`;
  const last = await prisma.academyBatch.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
    select: { code: true },
  });
  return seq(prefix, last?.code ?? null);
}

/** Drops empty-string optional fields so they don't overwrite with blanks. */
function cleanCourseInput<T extends Record<string, unknown>>(input: T): T {
  const out = { ...input };
  if (out.thumbnailUrl === '') delete out.thumbnailUrl;
  return out;
}

export const academyService = {
  // ---- Courses ----
  async listCourses(query: ListCoursesInput) {
    const where: Prisma.AcademyCourseWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { category: { contains: query.search, mode: 'insensitive' } },
        { profession: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.category && query.category !== 'all') where.category = query.category;
    if (query.status === 'active') Object.assign(where, { isActive: true, archivedAt: null });
    else if (query.status === 'inactive') Object.assign(where, { isActive: false, archivedAt: null });
    else if (query.status === 'archived') where.archivedAt = { not: null };

    return prisma.academyCourse.findMany({
      where,
      orderBy: { createdAt: query.sort === 'oldest' ? 'asc' : 'desc' },
      include: { _count: { select: { batches: true, students: true } } },
    });
  },
  async createCourse(input: CreateCourseInput) {
    return prisma.academyCourse.create({ data: cleanCourseInput(input) });
  },
  async updateCourse(id: string, input: UpdateCourseInput) {
    const { archived, ...rest } = input;
    const data: Prisma.AcademyCourseUpdateInput = cleanCourseInput(rest) as Prisma.AcademyCourseUpdateInput;
    if (archived === true) {
      data.archivedAt = new Date();
      data.isActive = false;
    } else if (archived === false) {
      data.archivedAt = null;
    }
    return prisma.academyCourse.update({ where: { id }, data });
  },
  async deleteCourse(id: string) {
    const course = await prisma.academyCourse.findUnique({
      where: { id },
      include: { _count: { select: { batches: true, students: true } } },
    });
    if (!course) throw HttpError.notFound('Course not found');
    if (course._count.students > 0 || course._count.batches > 0) {
      throw HttpError.conflict('Course has enrolled students or batches — archive it instead of deleting.');
    }
    await prisma.academyCourse.delete({ where: { id } });
    return { id };
  },
  async duplicateCourse(id: string) {
    const src = await prisma.academyCourse.findUnique({ where: { id } });
    if (!src) throw HttpError.notFound('Course not found');
    return prisma.academyCourse.create({
      data: {
        name: `${src.name} (Copy)`,
        description: src.description ?? undefined,
        category: src.category ?? undefined,
        profession: src.profession ?? undefined,
        level: src.level ?? undefined,
        durationWeeks: src.durationWeeks ?? undefined,
        price: src.price ?? undefined,
        thumbnailUrl: src.thumbnailUrl ?? undefined,
        learningObjectives: src.learningObjectives ?? undefined,
        syllabus: src.syllabus ?? undefined,
        isActive: false,
      },
    });
  },

  // ---- Faculty ----
  async listFaculty() {
    return prisma.academyFaculty.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { batches: true } } },
    });
  },
  async createFaculty(input: CreateFacultyInput) {
    return prisma.academyFaculty.create({ data: input });
  },

  // ---- Batches ----
  async listBatches() {
    return prisma.academyBatch.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { name: true } },
        faculty: { select: { name: true } },
        _count: { select: { students: true } },
      },
    });
  },
  async createBatch(input: CreateBatchInput) {
    await prisma.academyCourse.findUniqueOrThrow({ where: { id: input.courseId } });
    const code = await nextBatchCode();
    return prisma.academyBatch.create({
      data: { ...input, code, status: 'UPCOMING' },
      include: { course: { select: { name: true } } },
    });
  },
  async updateBatch(id: string, input: UpdateBatchInput) {
    return prisma.academyBatch.update({ where: { id }, data: input });
  },

  // ---- Students ----
  async listStudents(query: ListInput) {
    const where: Prisma.AcademyStudentWhereInput = {};
    if (query.status) where.status = query.status as never;
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
    const [items, total] = await Promise.all([
      prisma.academyStudent.findMany({
        where,
        include: { course: { select: { name: true } }, batch: { select: { code: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.academyStudent.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) };
  },
  async enrollStudent(input: EnrollStudentInput) {
    let leadId = input.leadId;
    let name = input.name;

    if (leadId) {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) throw HttpError.notFound('Lead not found');
      if (lead.serviceType !== 'academy') {
        throw HttpError.badRequest('Only academy leads can enroll as students.');
      }
      const existing = await prisma.academyStudent.findUnique({ where: { leadId } });
      if (existing) throw HttpError.conflict('This lead is already enrolled', { studentId: existing.id });
      name = name ?? lead.name;
      // Enrollment converts the lead.
      await prisma.lead.update({ where: { id: leadId }, data: { status: 'CONVERTED', convertedAt: new Date() } });
    }

    const reference = await nextStudentRef();
    return prisma.academyStudent.create({
      data: {
        reference,
        leadId: leadId ?? null,
        name: name!,
        courseId: input.courseId ?? null,
        batchId: input.batchId ?? null,
        status: 'ENROLLED',
      },
      include: { course: { select: { name: true } }, batch: { select: { code: true } } },
    });
  },
  async updateStudent(id: string, input: UpdateStudentInput) {
    const { issueCertificate, ...rest } = input;
    const data: Prisma.AcademyStudentUpdateInput = { ...rest } as Prisma.AcademyStudentUpdateInput;
    if (issueCertificate) {
      data.certificateIssuedAt = new Date();
      data.status = 'COMPLETED';
      data.progressPct = 100;
    }
    return prisma.academyStudent.update({ where: { id }, data });
  },

  // ---- Demos ----
  async listDemos() {
    return prisma.demoSession.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  },
  async createDemo(input: CreateDemoInput) {
    return prisma.demoSession.create({ data: input });
  },
  async updateDemo(id: string, input: UpdateDemoInput) {
    return prisma.demoSession.update({ where: { id }, data: input });
  },

  // ---- Stats ----
  async stats() {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [
      totalStudents, activeStudents, activeBatches, upcomingBatches, totalBatches,
      courses, totalCourses, faculty, demos, monthlyEnrollments,
    ] = await Promise.all([
      prisma.academyStudent.count(),
      prisma.academyStudent.count({ where: { status: 'ACTIVE' } }),
      prisma.academyBatch.count({ where: { status: 'ACTIVE' } }),
      prisma.academyBatch.count({ where: { status: 'UPCOMING' } }),
      prisma.academyBatch.count(),
      prisma.academyCourse.count({ where: { isActive: true, archivedAt: null } }),
      prisma.academyCourse.count(),
      prisma.academyFaculty.count({ where: { isActive: true } }),
      prisma.demoSession.count(),
      prisma.academyStudent.count({ where: { enrolledAt: { gte: monthStart } } }),
    ]);
    // `courses` = active courses (kept for existing dashboard); `totalCourses`/`totalBatches` new.
    return {
      totalStudents, activeStudents, activeBatches, upcomingBatches, totalBatches,
      courses, activeCourses: courses, totalCourses, faculty, demos, monthlyEnrollments,
    };
  },
};
