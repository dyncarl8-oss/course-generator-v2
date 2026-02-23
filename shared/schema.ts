import mongoose, { Schema, Document } from "mongoose";
import { z } from "zod";

export interface IUser extends Document {
  _id: string;
  whopUserId: string;
  email?: string;
  username?: string;
  profilePicUrl?: string;
  role: string;
  whopCompanyId?: string;
  adminBalance?: {
    totalEarnings: number;
    availableBalance: number;
    updatedAt: Date;
  };
  createdAt: Date;
}

export interface ICourseTheme {
  primaryColor: string;
  headingColor: string;
  backgroundColor: string;
  bodyTextColor: string;
  linkColor: string;
}

export interface ICourse extends Document {
  _id: string;
  creatorId: string;
  whopCompanyId: string;
  title: string;
  description?: string;
  coverImage?: string;
  theme?: ICourseTheme;
  published: boolean;
  isFree: boolean;
  price: string;
  generationStatus: "pending" | "generating" | "complete";
  createdAt: Date;
  updatedAt: Date;
}

export interface IModule extends Document {
  _id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  createdAt: Date;
}

export interface IMediaItem {
  id: string;
  type: "image" | "video";
  url: string;
  alt?: string;
  caption?: string;
  placement: number;
  prompt?: string;
}

export interface ILessonBlock {
  id: string;
  type: string;
  content: any;
  orderIndex: number;
}

export interface ILesson extends Document {
  _id: string;
  moduleId: string;
  title: string;
  content: string; // Keeping for legacy/plain-text fallback
  blocks?: ILessonBlock[];
  orderIndex: number;
  media: IMediaItem[];
  createdAt: Date;
}

export interface IQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index of the correct option
  explanation?: string;
}

export interface IQuiz extends Document {
  _id: string;
  moduleId: string;
  title: string;
  questions: IQuizQuestion[];
  createdAt: Date;
}

export interface IAssignment extends Document {
  _id: string;
  moduleId: string;
  lessonId?: string;
  title: string;
  instructions: string;
  allowFileUpload: boolean;
  createdAt: Date;
}

export interface ISurveyQuestion {
  id: string;
  question: string;
  type: "rating" | "multiple_choice" | "text";
  options?: string[];
}

export interface ISurvey extends Document {
  _id: string;
  moduleId: string;
  lessonId?: string;
  title: string;
  questions: ISurveyQuestion[];
  createdAt: Date;
}

export interface ICourseAccess extends Document {
  _id: string;
  courseId: string;
  userId: string;
  grantedAt: Date;
  purchasedViaWhop: boolean;
}

export interface IPayment extends Document {
  _id: string;
  courseId: string;
  buyerId: string;
  creatorId: string;
  amount: number;
  whopPaymentId: string;
  whopCheckoutId: string;
  status: "pending" | "completed" | "failed";
  createdAt: Date;
  completedAt?: Date;
}

export interface ICreatorEarnings extends Document {
  _id: string;
  creatorId: string;
  totalEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  updatedAt: Date;
}

const adminBalanceSchema = new Schema(
  {
    totalEarnings: { type: Number, default: 0 },
    availableBalance: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>({
  _id: { type: String, required: true },
  whopUserId: { type: String, required: true, unique: true },
  email: { type: String },
  username: { type: String },
  profilePicUrl: { type: String },
  role: { type: String, default: "member", required: true },
  whopCompanyId: { type: String },
  adminBalance: { type: adminBalanceSchema },
  createdAt: { type: Date, default: Date.now, required: true },
});

userSchema.index({ whopCompanyId: 1 });

const courseThemeSchema = new Schema(
  {
    primaryColor: { type: String, default: "#0f172a" },
    headingColor: { type: String, default: "#0f172a" },
    backgroundColor: { type: String, default: "#ffffff" },
    bodyTextColor: { type: String, default: "#334155" },
    linkColor: { type: String, default: "#2563eb" },
  },
  { _id: false },
);

const courseSchema = new Schema<ICourse>({
  _id: { type: String, required: true },
  creatorId: { type: String, required: true },
  whopCompanyId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  coverImage: { type: String },
  theme: { type: courseThemeSchema },
  published: { type: Boolean, default: false, required: true },
  isFree: { type: Boolean, default: true, required: true },
  price: { type: String, default: "0" },
  generationStatus: { type: String, enum: ["pending", "generating", "complete"], default: "complete" },
  createdAt: { type: Date, default: Date.now, required: true },
  updatedAt: { type: Date, default: Date.now, required: true },
});

courseSchema.index({ whopCompanyId: 1 });
courseSchema.index({ creatorId: 1 });
courseSchema.index({ published: 1 });

const moduleSchema = new Schema<IModule>({
  _id: { type: String, required: true },
  courseId: { type: String, required: true },
  title: { type: String, required: true },
  orderIndex: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now, required: true },
});

moduleSchema.index({ courseId: 1 });

const mediaItemSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ["image", "video"], required: true },
  url: { type: String, required: true },
  alt: { type: String },
  caption: { type: String },
  placement: { type: Number, required: true },
  prompt: { type: String },
}, { _id: false });

const lessonBlockSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  content: { type: Schema.Types.Mixed, required: true },
  orderIndex: { type: Number, required: true },
}, { _id: false });

const lessonSchema = new Schema<ILesson>({
  _id: { type: String, required: true },
  moduleId: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  blocks: { type: [lessonBlockSchema], default: [] },
  orderIndex: { type: Number, required: true },
  media: { type: [mediaItemSchema], default: [] },
  createdAt: { type: Date, default: Date.now, required: true },
});

lessonSchema.index({ moduleId: 1 });

const quizQuestionSchema = new Schema({
  id: { type: String, required: true },
  question: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: Number, required: true },
  explanation: { type: String },
}, { _id: false });

const quizSchema = new Schema<IQuiz>({
  _id: { type: String, required: true },
  moduleId: { type: String, required: true },
  title: { type: String, required: true },
  questions: { type: [quizQuestionSchema], default: [] },
  createdAt: { type: Date, default: Date.now, required: true },
});

quizSchema.index({ moduleId: 1 });

const assignmentSchema = new Schema<IAssignment>({
  _id: { type: String, required: true },
  moduleId: { type: String, required: true },
  lessonId: { type: String },
  title: { type: String, required: true },
  instructions: { type: String, required: true },
  allowFileUpload: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now, required: true },
});

assignmentSchema.index({ moduleId: 1 });
assignmentSchema.index({ lessonId: 1 });

const surveyQuestionSchema = new Schema({
  id: { type: String, required: true },
  question: { type: String, required: true },
  type: { type: String, enum: ["rating", "multiple_choice", "text"], required: true },
  options: { type: [String] },
}, { _id: false });

const surveySchema = new Schema<ISurvey>({
  _id: { type: String, required: true },
  moduleId: { type: String, required: true },
  lessonId: { type: String },
  title: { type: String, required: true },
  questions: { type: [surveyQuestionSchema], default: [] },
  createdAt: { type: Date, default: Date.now, required: true },
});

surveySchema.index({ moduleId: 1 });
surveySchema.index({ lessonId: 1 });

const courseAccessSchema = new Schema<ICourseAccess>({
  _id: { type: String, required: true },
  courseId: { type: String, required: true },
  userId: { type: String, required: true },
  grantedAt: { type: Date, default: Date.now, required: true },
  purchasedViaWhop: { type: Boolean, default: false },
});

courseAccessSchema.index({ courseId: 1, userId: 1 }, { unique: true });
courseAccessSchema.index({ userId: 1 });

const paymentSchema = new Schema<IPayment>({
  _id: { type: String, required: true },
  courseId: { type: String, required: true },
  buyerId: { type: String, required: true },
  creatorId: { type: String, required: true },
  amount: { type: Number, required: true },
  whopPaymentId: { type: String, default: "" },
  whopCheckoutId: { type: String, required: true },
  status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
  createdAt: { type: Date, default: Date.now, required: true },
  completedAt: { type: Date },
});

paymentSchema.index({ whopCheckoutId: 1 });
paymentSchema.index({ whopPaymentId: 1 });
paymentSchema.index({ creatorId: 1 });
paymentSchema.index({ status: 1 });

const creatorEarningsSchema = new Schema<ICreatorEarnings>({
  _id: { type: String, required: true },
  creatorId: { type: String, required: true, unique: true },
  totalEarnings: { type: Number, default: 0 },
  availableBalance: { type: Number, default: 0 },
  pendingBalance: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

export const UserModel = mongoose.models.User || mongoose.model<IUser>("User", userSchema);
export const CourseModel = mongoose.models.Course || mongoose.model<ICourse>("Course", courseSchema);
export const ModuleModel = mongoose.models.Module || mongoose.model<IModule>("Module", moduleSchema);
export const LessonModel = mongoose.models.Lesson || mongoose.model<ILesson>("Lesson", lessonSchema);
export const QuizModel = mongoose.models.Quiz || mongoose.model<IQuiz>("Quiz", quizSchema);
export const AssignmentModel = mongoose.models.Assignment || mongoose.model<IAssignment>("Assignment", assignmentSchema);
export const SurveyModel = mongoose.models.Survey || mongoose.model<ISurvey>("Survey", surveySchema);
export const CourseAccessModel = mongoose.models.CourseAccess || mongoose.model<ICourseAccess>("CourseAccess", courseAccessSchema);
export const PaymentModel = mongoose.models.Payment || mongoose.model<IPayment>("Payment", paymentSchema);
export const CreatorEarningsModel = mongoose.models.CreatorEarnings || mongoose.model<ICreatorEarnings>("CreatorEarnings", creatorEarningsSchema);

export type User = {
  id: string;
  whopUserId: string;
  email: string | null;
  username: string | null;
  profilePicUrl: string | null;
  role: string;
  whopCompanyId: string | null;
  adminBalance?: {
    totalEarnings: number;
    availableBalance: number;
    updatedAt: Date;
  };
  createdAt: Date;
};

export type Course = {
  id: string;
  creatorId: string;
  whopCompanyId: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  published: boolean;
  isFree: boolean;
  price: string | null;
  generationStatus: "pending" | "generating" | "complete";
  createdAt: Date;
  updatedAt: Date;
};

export type Module = {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  createdAt: Date;
};

export type MediaItem = {
  id: string;
  type: "image" | "video";
  url: string;
  alt?: string;
  caption?: string;
  placement: number;
  prompt?: string;
};

export type Lesson = {
  id: string;
  moduleId: string;
  title: string;
  content: string;
  orderIndex: number;
  media: MediaItem[];
  createdAt: Date;
};

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
};

export type Quiz = {
  id: string;
  moduleId: string;
  title: string;
  questions: QuizQuestion[];
  createdAt: Date;
};

export type CourseAccess = {
  id: string;
  courseId: string;
  userId: string;
  grantedAt: Date;
  purchasedViaWhop: boolean | null;
};

export type InsertUser = {
  id: string;
  whopUserId: string;
  email?: string | null;
  username?: string | null;
  profilePicUrl?: string | null;
  role?: string;
  whopCompanyId?: string | null;
};

export type InsertCourse = {
  creatorId: string;
  whopCompanyId: string;
  title: string;
  description?: string | null;
  coverImage?: string | null;
  published?: boolean;
  isFree?: boolean;
  price?: string | null;
  generationStatus?: "pending" | "generating" | "complete";
};

export type InsertModule = {
  courseId: string;
  title: string;
  orderIndex: number;
};

export type InsertLesson = {
  moduleId: string;
  title: string;
  content: string;
  orderIndex: number;
  media?: MediaItem[];
};

export type InsertQuiz = {
  moduleId: string;
  title: string;
  questions: QuizQuestion[];
};

export type InsertCourseAccess = {
  courseId: string;
  userId: string;
  purchasedViaWhop?: boolean;
};

export type Payment = {
  id: string;
  courseId: string;
  buyerId: string;
  creatorId: string;
  amount: number;
  whopPaymentId: string;
  whopCheckoutId: string;
  status: "pending" | "completed" | "failed";
  createdAt: Date;
  completedAt: Date | null;
};

export type InsertPayment = {
  courseId: string;
  buyerId: string;
  creatorId: string;
  amount: number;
  whopCheckoutId: string;
  whopPaymentId?: string;
  status?: "pending" | "completed" | "failed";
};

export type CreatorEarnings = {
  id: string;
  creatorId: string;
  totalEarnings: number;
  availableBalance: number;
  pendingBalance: number;
  updatedAt: Date;
};

export type CourseWithModules = Course & {
  modules: (Module & {
    lessons: Lesson[];
    quiz?: Quiz | null;
  })[];
  creator?: User;
};

export type ModuleWithLessons = Module & {
  lessons: Lesson[];
  quiz?: Quiz | null;
};

export const insertUserSchema = z.object({
  id: z.string(),
  whopUserId: z.string(),
  email: z.string().nullish(),
  username: z.string().nullish(),
  profilePicUrl: z.string().nullish(),
  role: z.string().optional(),
  whopCompanyId: z.string().nullish(),
});

export const insertCourseThemeSchema = z.object({
  primaryColor: z.string(),
  headingColor: z.string(),
  backgroundColor: z.string(),
  bodyTextColor: z.string(),
  linkColor: z.string(),
});

export const insertCourseSchema = z.object({
  creatorId: z.string(),
  whopCompanyId: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  coverImage: z.string().nullish(),
  theme: insertCourseThemeSchema.optional(),
  published: z.boolean().optional(),
  isFree: z.boolean().optional(),
  price: z.string().nullish(),
  generationStatus: z.enum(["pending", "generating", "complete"]).optional(),
});

export const insertModuleSchema = z.object({
  courseId: z.string(),
  title: z.string(),
  orderIndex: z.number(),
});

export const insertMediaItemSchema = z.object({
  id: z.string(),
  type: z.enum(["image", "video"]),
  url: z.string(),
  alt: z.string().optional(),
  caption: z.string().optional(),
  placement: z.number(),
  prompt: z.string().optional(),
});

export const insertLessonBlockSchema = z.object({
  id: z.string(),
  type: z.string(),
  content: z.any(),
  orderIndex: z.number(),
});

export const insertLessonSchema = z.object({
  moduleId: z.string(),
  title: z.string(),
  content: z.string(),
  blocks: z.array(insertLessonBlockSchema).optional(),
  orderIndex: z.number(),
  media: z.array(insertMediaItemSchema).optional(),
});

export const insertCourseAccessSchema = z.object({
  courseId: z.string(),
  userId: z.string(),
  purchasedViaWhop: z.boolean().optional(),
});

export const quizQuestionSchemaZod = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  correctAnswer: z.number(),
  explanation: z.string().optional(),
});

export const generatedCourseSchema = z.object({
  course_title: z.string(),
  description: z.string().optional(),
  modules: z.array(z.object({
    module_title: z.string(),
    lessons: z.array(z.object({
      lesson_title: z.string(),
      content: z.string(),
    })),
    quiz: z.object({
      title: z.string(),
      questions: z.array(z.object({
        question: z.string(),
        options: z.array(z.string()),
        correctAnswer: z.number(),
        explanation: z.string().optional(),
      })),
    }).optional(),
  })),
});

export type GeneratedCourse = z.infer<typeof generatedCourseSchema>;
