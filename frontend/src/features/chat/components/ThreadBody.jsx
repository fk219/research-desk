import AnswerBlock from "./AnswerBlock";

/**
 * Shared reading body for the signed-in desk and the public report. The first
 * question lives in the memo header; later questions become follow-ups.
 */
const ThreadBody = ({ messages = [] }) => {
  const firstUserIndex = messages.findIndex((message) => message.role === "user");
  let answerNumber = 0;

  return messages.map((message, index) => {
    const key = message._id || `${message.role}-${index}`;

    if (message.role === "user") {
      if (index === firstUserIndex) return null;

      return (
        <section className="follow-up" key={key} aria-label="Follow-up question">
          <p className="follow-up-label">Follow-up</p>
          <p className="follow-up-question">{message.content}</p>
        </section>
      );
    }

    answerNumber += 1;

    return <AnswerBlock key={key} message={message} number={answerNumber} />;
  });
};

export default ThreadBody;
