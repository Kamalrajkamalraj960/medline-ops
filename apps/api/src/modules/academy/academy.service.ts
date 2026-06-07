import { prisma, type Prisma } from '@medline/db';
import { HttpError } from '../../lib/http-error.js';
import type {
  CreateBatchInput, CreateCourseInput, CreateDemoInput, CreateFacultyInput,
  EnrollStudentInput, ListInput, UpdateBatchInput, UpdateCourseInput, UpdateDemoInput,
  UpdateStudentInput,
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

export const academyService = {
  // ---- Courses ----
  async listCourses() {
    return prisma.academyCourse.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { batches: true, students: true } } },
    });
  },
  async createCourse(input: CreateCourseInput) {
    return prisma.academyCourse.create({ data: input });
  },
  async updateCourse(id: string, input: UpdateCourseInput) {
    return prisma.academyCourse.update({ where: { id }, data: input });
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
    const [totalStudents, activeStudents, activeBatches, upcomingBatches, courses, faculty, demos, monthlyEnrollments] =
      await Promise.all([
        prisma.academyStudent.count(),
        prisma.academyStudent.count({ where: { status: 'ACTIVE' } }),
        prisma.academyBatch.count({ where: { status: 'ACTIVE' } }),
        prisma.academyBatch.count({ where: { status: 'UPCOMING' } }),
        prisma.academyCourse.count({ where: { isActive: true } }),
        prisma.academyFaculty.count({ where: { isActive: true } }),
        prisma.demoSession.count(),
        prisma.academyStudent.count({ where: { enrolledAt: { gte: monthStart } } }),
      ]);
    return { totalStudents, activeStudents, activeBatches, upcomingBatches, courses, faculty, demos, monthlyEnrollments };
  },
};
