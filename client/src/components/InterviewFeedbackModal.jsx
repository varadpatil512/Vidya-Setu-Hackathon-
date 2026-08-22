import { useState } from 'react';
import { Star, MessageSquare, Check, Sparkles, X } from 'lucide-react';
import { feedbackAPI } from '../lib/api';

const TAG_OPTIONS = [
  'Fair & relevant',
  'Questions felt generic',
  'Too difficult',
  'Too easy',
  'Technical issue',
];

export default function InterviewFeedbackModal({ submissionId, onComplete }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTag, setSelectedTag] = useState('Fair & relevant');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!submissionId) {
      onComplete?.();
      return;
    }

    try {
      setSubmitting(true);
      await feedbackAPI.submitInterviewFeedback({
        submissionId,
        rating,
        tag: selectedTag,
        comment: comment.trim(),
      });
      setSubmitted(true);
      setTimeout(() => {
        onComplete?.();
      }, 1200);
    } catch (err) {
      // If error occurs, still allow continuing smoothly
      console.error('Feedback submit error:', err);
      onComplete?.();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    onComplete?.();
  };

  return (
    <div className="p-6 bg-vs-surface border border-vs-border rounded-lg shadow-lg max-w-lg mx-auto mt-6 text-vs-text animate-fade-in text-left space-y-4">
      {submitted ? (
        <div className="py-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center mx-auto">
            <Check className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-vs-text">Thank You for Your Feedback!</h3>
          <p className="text-xs text-vs-muted">Your response helps us improve the AI interview experience.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-vs-accent">
              <Sparkles className="w-4 h-4" />
              <h3 className="text-sm font-bold text-vs-text">How was your AI interview experience?</h3>
            </div>
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs text-vs-muted hover:text-vs-text flex items-center gap-1 transition-colors"
            >
              Skip
            </button>
          </div>

          {/* Star Rating */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-vs-muted block">Rating</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 rounded transition-transform hover:scale-110 focus:outline-none"
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        isFilled
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-vs-border dark:text-vs-border hover:text-amber-300'
                      }`}
                    />
                  </button>
                );
              })}
              <span className="text-xs font-bold text-vs-text ml-2">
                {rating === 5 ? '⭐ Excellent' : rating === 4 ? '👍 Good' : rating === 3 ? '😐 Average' : rating === 2 ? '👎 Needs Work' : '😞 Poor'}
              </span>
            </div>
          </div>

          {/* Experience Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-vs-muted block">What best describes your experience?</label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tagOption) => {
                const isSelected = selectedTag === tagOption;
                return (
                  <button
                    key={tagOption}
                    type="button"
                    onClick={() => setSelectedTag(tagOption)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-vs-accent-light border-vs-accent text-vs-accent font-semibold shadow-sm'
                        : 'bg-vs-surface-2 border-vs-border text-vs-muted hover:text-vs-text hover:border-vs-accent-light'
                    }`}
                  >
                    {tagOption}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comments Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-vs-muted flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> Any comments? (optional)
            </label>
            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Was a question confusing? Did timing/difficulty feel fair?"
              className="w-full p-2.5 bg-vs-surface-2 border border-vs-border rounded text-xs text-vs-text placeholder-vs-subtle focus:outline-none focus:border-vs-accent transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleSkip}
              className="px-4 py-2 text-xs font-semibold text-vs-muted hover:text-vs-text rounded transition-colors"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-vs-accent hover:bg-vs-accent-hover text-white text-xs font-bold rounded transition-all btn-scale shadow-sm flex items-center gap-1.5"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
