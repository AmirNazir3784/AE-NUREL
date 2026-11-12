export type CommunityQuestion = {
  question: string;
  answer: string;
  discussion: string;
  // A related practical follow-up is not falsely attributed as a verbatim post.
  basis: "reported-problem" | "practical-follow-up";
};

export type ArticleQuestionSet = {
  slug: string;
  title: string;
  verification: readonly string[];
  items: readonly CommunityQuestion[];
};

export const q = (question: string, answer: string, discussion: string,
  basis: CommunityQuestion["basis"] = "practical-follow-up"): CommunityQuestion =>
  ({ question, answer, discussion, basis });
