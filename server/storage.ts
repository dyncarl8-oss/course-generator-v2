import {
  UserModel, CourseModel, ModuleModel, LessonModel, CourseAccessModel,
  PaymentModel, CreatorEarningsModel,
  type User, type InsertUser,
  type Course, type InsertCourse,
  type Module, type InsertModule,
  type Lesson, type InsertLesson, type MediaItem,
  type CourseAccess, type InsertCourseAccess,
  type Payment, type InsertPayment,
  type CreatorEarnings,
  type CourseWithModules,
  QuizModel, type Quiz, type InsertQuiz
} from "@shared/schema";
import { randomUUID } from "crypto";
import process from "process";

interface AdminBalance {
  totalEarnings: number;
  availableBalance: number;
  updatedAt: Date;
}

function docToUser(doc: any): User {
  return {
    id: doc._id,
    whopUserId: doc.whopUserId,
    email: doc.email || null,
    username: doc.username || null,
    profilePicUrl: doc.profilePicUrl || null,
    role: doc.role,
    whopCompanyId: doc.whopCompanyId || null,
    adminBalance: doc.adminBalance || undefined,
    createdAt: doc.createdAt,
  };
}

function docToCourse(doc: any): Course {
  return {
    id: doc._id,
    creatorId: doc.creatorId,
    whopCompanyId: doc.whopCompanyId,
    title: doc.title,
    description: doc.description || null,
    coverImage: doc.coverImage || null,
    theme: doc.theme ? {
      primaryColor: doc.theme.primaryColor,
      headingColor: doc.theme.headingColor,
      backgroundColor: doc.theme.backgroundColor,
      bodyTextColor: doc.theme.bodyTextColor,
      linkColor: doc.theme.linkColor,
    } : undefined,
    published: doc.published,
    isFree: doc.isFree,
    price: doc.price || null,
    generationStatus: doc.generationStatus || "complete",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function docToModule(doc: any): Module {
  return {
    id: doc._id,
    courseId: doc.courseId,
    title: doc.title,
    orderIndex: doc.orderIndex,
    createdAt: doc.createdAt,
  };
}

function docToLesson(doc: any): Lesson {
  return {
    id: doc._id,
    moduleId: doc.moduleId,
    title: doc.title,
    content: doc.content,
    blocks: (doc.blocks || []).map((b: any) => ({
      id: b.id,
      type: b.type,
      content: b.content,
      orderIndex: b.orderIndex,
    })),
    orderIndex: doc.orderIndex,
    media: (doc.media || []).map((m: any) => ({
      id: m.id,
      type: m.type,
      url: m.url,
      alt: m.alt,
      caption: m.caption,
      placement: m.placement,
      prompt: m.prompt,
    })),
    createdAt: doc.createdAt,
  };
}

function docToCourseAccess(doc: any): CourseAccess {
  return {
    id: doc._id,
    courseId: doc.courseId,
    userId: doc.userId,
    grantedAt: doc.grantedAt,
    purchasedViaWhop: doc.purchasedViaWhop ?? null,
  };
}

function docToPayment(doc: any): Payment {
  return {
    id: doc._id,
    courseId: doc.courseId,
    buyerId: doc.buyerId,
    creatorId: doc.creatorId,
    amount: doc.amount,
    whopPaymentId: doc.whopPaymentId,
    whopCheckoutId: doc.whopCheckoutId,
    status: doc.status,
    createdAt: doc.createdAt,
    completedAt: doc.completedAt || null,
  };
}

function docToCreatorEarnings(doc: any): CreatorEarnings {
  return {
    id: doc._id,
    creatorId: doc.creatorId,
    totalEarnings: doc.totalEarnings,
    availableBalance: doc.availableBalance,
    pendingBalance: doc.pendingBalance,
    updatedAt: doc.updatedAt,
  };
}

function docToQuiz(doc: any): Quiz {
  return {
    id: doc._id,
    moduleId: doc.moduleId,
    title: doc.title,
    questions: (doc.questions || []).map((q: any) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    })),
    createdAt: doc.createdAt,
  };
}

export interface IStorage {
  ensureUserBalanceFields(): Promise<void>;
  ensureAdminBalanceInitialized(userId: string): Promise<void>;

  getUser(id: string): Promise<User | undefined>;
  getUserByWhopId(whopUserId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  getCourse(id: string): Promise<Course | undefined>;
  getCourseWithModules(id: string): Promise<CourseWithModules | undefined>;
  getCoursesByCreator(creatorId: string, companyId: string): Promise<Course[]>;
  getPublishedCourses(): Promise<Course[]>;
  getPublishedCoursesByCompany(companyId: string): Promise<CourseWithModules[]>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, updates: Partial<Course>): Promise<Course | undefined>;
  deleteCourse(id: string): Promise<void>;

  getModule(id: string): Promise<Module | undefined>;
  getModulesByCourse(courseId: string): Promise<Module[]>;
  createModule(module: InsertModule): Promise<Module>;
  updateModule(id: string, updates: Partial<Module>): Promise<Module | undefined>;
  deleteModule(id: string): Promise<void>;

  getLesson(id: string): Promise<Lesson | undefined>;
  getLessonsByModule(moduleId: string): Promise<Lesson[]>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(id: string, updates: Partial<Lesson>): Promise<Lesson | undefined>;
  deleteLesson(id: string): Promise<void>;

  getQuiz(id: string): Promise<Quiz | undefined>;
  getQuizByModule(moduleId: string): Promise<Quiz | undefined>;
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  updateQuiz(id: string, updates: Partial<Quiz>): Promise<Quiz | undefined>;
  deleteQuiz(id: string): Promise<void>;

  getCourseAccess(courseId: string, userId: string): Promise<CourseAccess | undefined>;
  getCourseAccessByUser(userId: string): Promise<CourseAccess[]>;
  getCourseAccessByCourse(courseId: string): Promise<(CourseAccess & { user: User })[]>;
  grantCourseAccess(access: InsertCourseAccess): Promise<CourseAccess>;
  revokeCourseAccess(courseId: string, userId: string): Promise<void>;

  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentByCheckoutId(checkoutId: string): Promise<Payment | undefined>;
  getPaymentsByCourse(courseId: string): Promise<Payment[]>;
  updatePaymentStatus(id: string, status: Payment["status"], whopPaymentId?: string): Promise<Payment | undefined>;

  getCreatorEarnings(creatorId: string): Promise<CreatorEarnings | undefined>;
  addCreatorEarnings(creatorId: string, amount: number): Promise<CreatorEarnings>;
  deductCreatorEarnings(creatorId: string, amount: number): Promise<CreatorEarnings>;

  addAdminEarnings(amount: number): Promise<void>;
  deductAdminEarnings(adminId: string, amount: number): Promise<void>;

  getCoursesGeneratedToday(creatorId: string): Promise<number>;
  createFullCourseStructure(courseId: string, data: GeneratedCourse): Promise<{ moduleIndex: number; lessonIndex: number; lessonId: string }[]>;
}

export class DatabaseStorage implements IStorage {
  async ensureUserBalanceFields(): Promise<void> {
    const now = new Date();
    // Remove adminBalance from non-admin users (creators, members, etc.)
    await UserModel.updateMany(
      {
        role: { $ne: "admin" },
        adminBalance: { $exists: true }
      },
      {
        $unset: {
          adminBalance: "",
        },
      },
    );

    // Only initialize adminBalance for admin users (platform owners)
    await UserModel.updateMany(
      {
        role: "admin",
        adminBalance: { $exists: false }
      },
      {
        $set: {
          adminBalance: {
            totalEarnings: 0,
            availableBalance: 0,
            updatedAt: now,
          },
        },
      },
    );
  }

  async ensureAdminBalanceInitialized(userId: string): Promise<void> {
    const user = await UserModel.findById(userId).select({ role: 1, adminBalance: 1 });
    if (!user) return;

    // Only initialize adminBalance for admin users
    if (user.role === "admin" && (!user.adminBalance || typeof user.adminBalance !== 'object')) {
      await UserModel.findByIdAndUpdate(userId, {
        $set: {
          adminBalance: {
            totalEarnings: 0,
            availableBalance: 0,
            updatedAt: new Date(),
          },
        },
      });
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const doc = await UserModel.findById(id);
    return doc ? docToUser(doc) : undefined;
  }

  async getUserByWhopId(whopUserId: string): Promise<User | undefined> {
    const doc = await UserModel.findOne({ whopUserId });
    return doc ? docToUser(doc) : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const doc = await UserModel.create({
      _id: insertUser.id,
      whopUserId: insertUser.whopUserId,
      email: insertUser.email,
      username: insertUser.username,
      profilePicUrl: insertUser.profilePicUrl,
      role: insertUser.role || "member",
      whopCompanyId: insertUser.whopCompanyId,
    });
    return docToUser(doc);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const updateObj: any = { ...updates };
    if ('id' in updateObj) delete updateObj.id;

    const doc = await UserModel.findByIdAndUpdate(id, updateObj, { new: true });
    return doc ? docToUser(doc) : undefined;
  }

  async getCourse(id: string): Promise<Course | undefined> {
    const doc = await CourseModel.findById(id);
    return doc ? docToCourse(doc) : undefined;
  }

  async getCourseWithModules(id: string): Promise<CourseWithModules | undefined> {
    const course = await this.getCourse(id);
    if (!course) return undefined;

    const [moduleDocs, creatorDoc] = await Promise.all([
      ModuleModel.find({ courseId: id }).sort({ orderIndex: 1 }),
      UserModel.findById(course.creatorId)
    ]);

    const moduleIds = moduleDocs.map(m => m._id);
    const [allLessonDocs, allQuizDocs] = await Promise.all([
      LessonModel.find({ moduleId: { $in: moduleIds } }).sort({ orderIndex: 1 }),
      QuizModel.find({ moduleId: { $in: moduleIds } })
    ]);

    const lessonsByModule = new Map<string, typeof allLessonDocs>();
    for (const lesson of allLessonDocs) {
      const moduleId = lesson.moduleId;
      if (!lessonsByModule.has(moduleId)) {
        lessonsByModule.set(moduleId, []);
      }
      lessonsByModule.get(moduleId)!.push(lesson);
    }

    const quizByModule = new Map<string, any>();
    for (const quiz of allQuizDocs) {
      quizByModule.set(quiz.moduleId, quiz);
    }

    const modulesWithLessons = moduleDocs.map((moduleDoc: any) => ({
      ...docToModule(moduleDoc),
      lessons: (lessonsByModule.get(moduleDoc._id) || []).map(docToLesson),
      quiz: quizByModule.has(moduleDoc._id) ? docToQuiz(quizByModule.get(moduleDoc._id)) : null,
    }));

    const creator = creatorDoc ? docToUser(creatorDoc) : undefined;

    return { ...course, modules: modulesWithLessons, creator };
  }

  async getCoursesByCreator(creatorId: string, companyId: string): Promise<Course[]> {
    const docs = await CourseModel.find({ creatorId, whopCompanyId: companyId }).sort({ createdAt: -1 });
    return docs.map(docToCourse);
  }

  async getPublishedCourses(): Promise<Course[]> {
    const docs = await CourseModel.find({ published: true }).sort({ createdAt: -1 });
    return docs.map(docToCourse);
  }

  async getPublishedCoursesByCompany(companyId: string): Promise<CourseWithModules[]> {
    const courseDocs = await CourseModel.find({
      whopCompanyId: companyId,
      published: true
    }).sort({ createdAt: -1 });

    const result: CourseWithModules[] = [];
    for (const courseDoc of courseDocs) {
      const courseWithModules = await this.getCourseWithModules(courseDoc._id);
      if (courseWithModules) {
        const creatorDoc = await UserModel.findById(courseDoc.creatorId);
        result.push({ ...courseWithModules, creator: creatorDoc ? docToUser(creatorDoc) : undefined });
      }
    }
    return result;
  }

  async createCourse(insertCourse: InsertCourse): Promise<Course> {
    const id = randomUUID();
    const doc = await CourseModel.create({
      _id: id,
      creatorId: insertCourse.creatorId,
      whopCompanyId: insertCourse.whopCompanyId,
      title: insertCourse.title,
      description: insertCourse.description,
      coverImage: insertCourse.coverImage,
      published: insertCourse.published ?? false,
      isFree: insertCourse.isFree ?? true,
      price: insertCourse.price || "0",
      generationStatus: insertCourse.generationStatus ?? "complete",
    });
    return docToCourse(doc);
  }

  async updateCourse(id: string, updates: Partial<Course>): Promise<Course | undefined> {
    const updateObj: any = { ...updates, updatedAt: new Date() };
    if ('id' in updateObj) delete updateObj.id;

    const doc = await CourseModel.findByIdAndUpdate(id, updateObj, { new: true });
    return doc ? docToCourse(doc) : undefined;
  }

  async deleteCourse(id: string): Promise<void> {
    const modules = await ModuleModel.find({ courseId: id });
    for (const mod of modules) {
      await LessonModel.deleteMany({ moduleId: mod._id });
      await QuizModel.deleteMany({ moduleId: mod._id });
    }
    await ModuleModel.deleteMany({ courseId: id });
    await CourseAccessModel.deleteMany({ courseId: id });
    await CourseModel.findByIdAndDelete(id);
  }

  async getModule(id: string): Promise<Module | undefined> {
    const doc = await ModuleModel.findById(id);
    return doc ? docToModule(doc) : undefined;
  }

  async getModulesByCourse(courseId: string): Promise<Module[]> {
    const docs = await ModuleModel.find({ courseId }).sort({ orderIndex: 1 });
    return docs.map(docToModule);
  }

  async createModule(insertModule: InsertModule): Promise<Module> {
    const id = randomUUID();
    const doc = await ModuleModel.create({
      _id: id,
      courseId: insertModule.courseId,
      title: insertModule.title,
      orderIndex: insertModule.orderIndex,
    });
    return docToModule(doc);
  }

  async updateModule(id: string, updates: Partial<Module>): Promise<Module | undefined> {
    const updateObj: any = { ...updates };
    if ('id' in updateObj) delete updateObj.id;

    const doc = await ModuleModel.findByIdAndUpdate(id, updateObj, { new: true });
    return doc ? docToModule(doc) : undefined;
  }

  async deleteModule(id: string): Promise<void> {
    await LessonModel.deleteMany({ moduleId: id });
    await QuizModel.deleteMany({ moduleId: id });
    await ModuleModel.findByIdAndDelete(id);
  }

  async getLesson(id: string): Promise<Lesson | undefined> {
    const doc = await LessonModel.findById(id);
    return doc ? docToLesson(doc) : undefined;
  }

  async getLessonsByModule(moduleId: string): Promise<Lesson[]> {
    const docs = await LessonModel.find({ moduleId }).sort({ orderIndex: 1 });
    return docs.map(docToLesson);
  }

  async createLesson(insertLesson: InsertLesson): Promise<Lesson> {
    const id = randomUUID();
    const doc = await LessonModel.create({
      _id: id,
      moduleId: insertLesson.moduleId,
      title: insertLesson.title,
      content: insertLesson.content,
      orderIndex: insertLesson.orderIndex,
      media: insertLesson.media || [],
    });
    return docToLesson(doc);
  }

  async updateLesson(id: string, updates: Partial<Lesson>): Promise<Lesson | undefined> {
    const updateObj: any = { ...updates };
    if ('id' in updateObj) delete updateObj.id;

    const doc = await LessonModel.findByIdAndUpdate(id, updateObj, { new: true });
    return doc ? docToLesson(doc) : undefined;
  }

  async addLessonMedia(lessonId: string, media: MediaItem): Promise<Lesson | undefined> {
    const doc = await LessonModel.findByIdAndUpdate(
      lessonId,
      { $push: { media } },
      { new: true }
    );
    return doc ? docToLesson(doc) : undefined;
  }

  async deleteLesson(id: string): Promise<void> {
    await LessonModel.findByIdAndDelete(id);
  }

  async getQuiz(id: string): Promise<Quiz | undefined> {
    const doc = await QuizModel.findById(id);
    return doc ? docToQuiz(doc) : undefined;
  }

  async getQuizByModule(moduleId: string): Promise<Quiz | undefined> {
    const doc = await QuizModel.findOne({ moduleId });
    return doc ? docToQuiz(doc) : undefined;
  }

  async createQuiz(insertQuiz: InsertQuiz): Promise<Quiz> {
    const id = randomUUID();
    const doc = await QuizModel.create({
      _id: id,
      moduleId: insertQuiz.moduleId,
      title: insertQuiz.title,
      questions: insertQuiz.questions,
    });
    return docToQuiz(doc);
  }

  async updateQuiz(id: string, updates: Partial<Quiz>): Promise<Quiz | undefined> {
    const updateObj: any = { ...updates };
    if ('id' in updateObj) delete updateObj.id;

    const doc = await QuizModel.findByIdAndUpdate(id, updateObj, { new: true });
    return doc ? docToQuiz(doc) : undefined;
  }

  async deleteQuiz(id: string): Promise<void> {
    await QuizModel.findByIdAndDelete(id);
  }

  async getCourseAccess(courseId: string, userId: string): Promise<CourseAccess | undefined> {
    const doc = await CourseAccessModel.findOne({ courseId, userId });
    return doc ? docToCourseAccess(doc) : undefined;
  }

  async getCourseAccessByUser(userId: string): Promise<CourseAccess[]> {
    const docs = await CourseAccessModel.find({ userId });
    return docs.map(docToCourseAccess);
  }

  async getCourseAccessByCourse(courseId: string): Promise<(CourseAccess & { user: User })[]> {
    const accessDocs = await CourseAccessModel.find({ courseId });

    if (accessDocs.length === 0) {
      return [];
    }

    const userIds = accessDocs.map((a: any) => a.userId);
    const userDocs = await UserModel.find({ _id: { $in: userIds } });
    const userMap = new Map(userDocs.map((u: any) => [u._id, u]));

    const result: (CourseAccess & { user: User })[] = [];
    for (const accessDoc of accessDocs) {
      const userDoc = userMap.get(accessDoc.userId);
      if (userDoc) {
        result.push({
          ...docToCourseAccess(accessDoc),
          user: docToUser(userDoc),
        });
      }
    }

    return result;
  }

  async grantCourseAccess(insertAccess: InsertCourseAccess): Promise<CourseAccess> {
    const id = randomUUID();
    const doc = await CourseAccessModel.create({
      _id: id,
      courseId: insertAccess.courseId,
      userId: insertAccess.userId,
      purchasedViaWhop: insertAccess.purchasedViaWhop ?? false,
    });
    return docToCourseAccess(doc);
  }

  async revokeCourseAccess(courseId: string, userId: string): Promise<void> {
    await CourseAccessModel.deleteOne({ courseId, userId });
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const doc = await PaymentModel.create({
      _id: id,
      courseId: insertPayment.courseId,
      buyerId: insertPayment.buyerId,
      creatorId: insertPayment.creatorId,
      amount: insertPayment.amount,
      whopCheckoutId: insertPayment.whopCheckoutId,
      whopPaymentId: insertPayment.whopPaymentId || "",
      status: insertPayment.status || "pending",
    });
    return docToPayment(doc);
  }

  async getPaymentByCheckoutId(checkoutId: string): Promise<Payment | undefined> {
    const doc = await PaymentModel.findOne({ whopCheckoutId: checkoutId });
    return doc ? docToPayment(doc) : undefined;
  }

  async getPaymentsByCourse(courseId: string): Promise<Payment[]> {
    const docs = await PaymentModel.find({ courseId, status: "completed" }).sort({ createdAt: -1 });
    return docs.map(docToPayment);
  }

  async updatePaymentStatus(id: string, status: Payment["status"], whopPaymentId?: string): Promise<Payment | undefined> {
    const updateObj: any = { status };
    if (status === "completed") {
      updateObj.completedAt = new Date();
    }
    if (whopPaymentId) {
      updateObj.whopPaymentId = whopPaymentId;
    }
    const doc = await PaymentModel.findByIdAndUpdate(id, updateObj, { new: true });
    return doc ? docToPayment(doc) : undefined;
  }

  async getCreatorEarnings(creatorId: string): Promise<CreatorEarnings | undefined> {
    const doc = await CreatorEarningsModel.findOne({ creatorId });
    return doc ? docToCreatorEarnings(doc) : undefined;
  }

  async addCreatorEarnings(creatorId: string, amount: number): Promise<CreatorEarnings> {
    const existing = await CreatorEarningsModel.findOne({ creatorId });

    if (existing) {
      const doc = await CreatorEarningsModel.findByIdAndUpdate(
        existing._id,
        {
          $inc: { totalEarnings: amount, availableBalance: amount },
          updatedAt: new Date(),
        },
        { new: true }
      );
      return docToCreatorEarnings(doc!);
    } else {
      const id = randomUUID();
      const doc = await CreatorEarningsModel.create({
        _id: id,
        creatorId,
        totalEarnings: amount,
        availableBalance: amount,
        pendingBalance: 0,
      });
      return docToCreatorEarnings(doc);
    }
  }

  async deductCreatorEarnings(creatorId: string, amount: number): Promise<CreatorEarnings> {
    const existing = await CreatorEarningsModel.findOne({ creatorId });
    if (!existing) {
      throw new Error("Creator earnings not found");
    }

    if (existing.availableBalance < amount) {
      throw new Error("Insufficient available balance");
    }

    const doc = await CreatorEarningsModel.findByIdAndUpdate(
      existing._id,
      {
        $inc: { availableBalance: -amount },
        updatedAt: new Date(),
      },
      { new: true }
    );
    return docToCreatorEarnings(doc!);
  }

  async addAdminEarnings(amount: number): Promise<void> {
    if (!Number.isFinite(amount) || amount === 0) return;

    const adminUserId = process.env.PLATFORM_ADMIN_USER_ID;
    const adminWhopUserId = process.env.PLATFORM_ADMIN_WHOP_USER_ID;

    const adminQuery = adminUserId
      ? { _id: adminUserId }
      : adminWhopUserId
        ? { whopUserId: adminWhopUserId }
        : { role: "admin" };

    const adminUser = await UserModel.findOne(adminQuery).select({ _id: 1, role: 1 }).lean();
    if (!adminUser) {
      console.warn(
        "addAdminEarnings: No platform admin user found. Set PLATFORM_ADMIN_USER_ID / PLATFORM_ADMIN_WHOP_USER_ID or mark a user with role='admin' to track platform earnings.",
      );
      return;
    }

    // Ensure admin balance is initialized for this admin user
    await this.ensureAdminBalanceInitialized(adminUser._id);

    await UserModel.findByIdAndUpdate(adminUser._id, {
      $inc: {
        "adminBalance.totalEarnings": amount,
        "adminBalance.availableBalance": amount,
      },
      $set: {
        "adminBalance.updatedAt": new Date(),
      },
    });
  }

  async deductAdminEarnings(adminId: string, amount: number): Promise<void> {
    const user = await UserModel.findById(adminId);
    if (!user || user.role !== "admin" || !user.adminBalance) {
      throw new Error("Admin user or balance not found");
    }

    if (user.adminBalance.availableBalance < amount) {
      throw new Error("Insufficient available balance");
    }

    await UserModel.findByIdAndUpdate(adminId, {
      $inc: {
        "adminBalance.availableBalance": -amount,
      },
      $set: {
        "adminBalance.updatedAt": new Date(),
      },
    });
  }

  async getCoursesGeneratedToday(creatorId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);

    const courses = await CourseModel.find({
      creatorId,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    }).select('title generationStatus createdAt');

    console.log(`[Limit Debug] Found ${courses.length} courses for user ${creatorId} today:`,
      courses.map(c => `"${c.title}" (${c.generationStatus}) at ${c.createdAt.toISOString()}`).join(', ')
    );

    return courses.length;
  }

  async createFullCourseStructure(courseId: string, data: GeneratedCourse): Promise<{ moduleIndex: number; lessonIndex: number; lessonId: string }[] | any> {
    const createdLessons: { moduleIndex: number; lessonIndex: number; lessonId: string }[] = [];

    for (let i = 0; i < data.modules.length; i++) {
      const moduleData = data.modules[i];
      const moduleId = randomUUID();

      // Create module
      await ModuleModel.create({
        _id: moduleId,
        courseId: courseId,
        title: moduleData.module_title,
        orderIndex: i,
      });

      // Create quiz if exists
      if (moduleData.quiz) {
        await QuizModel.create({
          _id: randomUUID(),
          moduleId: moduleId,
          title: moduleData.quiz.title,
          questions: moduleData.quiz.questions.map(q => ({
            id: randomUUID(),
            ...q,
          })),
        });
      }

      // Create lessons for this module
      const lessonInsertions = moduleData.lessons.map((lessonData, j) => {
        const lessonId = randomUUID();
        createdLessons.push({ moduleIndex: i, lessonIndex: j, lessonId });
        return {
          _id: lessonId,
          moduleId: moduleId,
          title: lessonData.lesson_title,
          content: lessonData.content,
          orderIndex: j,
          media: [],
        };
      });

      if (lessonInsertions.length > 0) {
        await LessonModel.insertMany(lessonInsertions);
      }
    }

    return createdLessons;
  }
}

export const storage = new DatabaseStorage();
