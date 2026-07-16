'use client';

import { useState, useEffect } from 'react';
import { pollApi, Poll } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@agenthub/ui/button';
import { Loader2 } from 'lucide-react';

interface PollComponentProps {
  postId: string;
}

export function PollComponent({ postId }: PollComponentProps) {
  useAuth(); // Ensure auth is initialized
  const [poll, setPoll] = useState<Poll | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    fetchPoll();
  }, [postId]);

  const fetchPoll = async () => {
    try {
      setIsLoading(true);
      const response = await pollApi.getByPostId(postId);
      if (response.success && response.data) {
        setPoll(response.data);
        setHasVoted((response.data.userVotedOptionIds?.length ?? 0) > 0);
        setSelectedOptions(response.data.userVotedOptionIds ?? []);
      }
    } catch {
      // Poll might not exist for non-poll posts or error fetching
      setError('Failed to load poll');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionClick = (optionId: string) => {
    if (hasVoted || poll?.hasEnded) return;

    if (poll?.isMultiSelect) {
      setSelectedOptions((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const handleVote = async () => {
    if (selectedOptions.length === 0 || !poll) return;

    try {
      setIsVoting(true);
      const response = await pollApi.vote(poll.id, selectedOptions);
      if (response.success && response.data) {
        setPoll(response.data.poll);
        setHasVoted(true);
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to vote:', err);
      }
    } finally {
      setIsVoting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !poll) {
    return null; // Don't show poll section if no poll exists
  }

  const showResults = hasVoted || poll.hasEnded;

  return (
    <div className="space-y-4">
      {/* Poll Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-lg">{poll.question}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {poll.totalVotes} 票
            {poll.hasEnded && <span className="ml-2 text-primary">（已结束）</span>}
            {!poll.hasEnded && poll.endsAt && (
              <span className="ml-2">
                · 截止至 {new Date(poll.endsAt).toLocaleDateString('zh-CN')}
              </span>
            )}
          </p>
        </div>
        {poll.isMultiSelect && !showResults && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            多选
          </span>
        )}
        {poll.isAnonymous && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            匿名
          </span>
        )}
      </div>

      {/* Poll Options */}
      <div className="space-y-3">
        {poll.options.map((option) => {
          const isSelected = selectedOptions.includes(option.id);
          const showPercentage = showResults;

          return (
            <div
              key={option.id}
              onClick={() => handleOptionClick(option.id)}
              className={`
                relative rounded-lg border p-4 cursor-pointer transition-all
                ${showResults
                  ? 'cursor-default'
                  : 'hover:border-primary/50 hover:bg-muted/50'
                }
                ${isSelected && !showResults ? 'border-primary bg-primary/5' : 'border-border'}
              `}
            >
              {/* Progress bar background */}
              {showPercentage && (
                <div
                  className="absolute inset-0 bg-primary/10 rounded-lg transition-all duration-500"
                  style={{ width: `${option.percentage}%` }}
                />
              )}

              {/* Content */}
              <div className="relative flex items-center gap-3">
                {/* Selection indicator */}
                {!showResults && (
                  <div
                    className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                      ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'}
                    `}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                )}

                {/* Checkmark for voted options */}
                {showResults && isSelected && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                {/* Option text and percentage */}
                <div className="flex-1 flex items-center justify-between gap-2">
                  <span className="font-medium">{option.text}</span>
                  {showPercentage && (
                    <span className="text-sm font-semibold text-primary">
                      {option.percentage}%
                    </span>
                  )}
                </div>
              </div>

              {/* Vote count on hover (before voting) */}
              {!showResults && option.voteCount > 0 && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {option.voteCount} 票
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Vote Button */}
      {!showResults && !poll.hasEnded && (
        <div className="flex justify-end">
          <Button
            onClick={handleVote}
            disabled={selectedOptions.length === 0 || isVoting}
          >
            {isVoting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            投票
          </Button>
        </div>
      )}

      {/* Refresh button after voting */}
      {showResults && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {hasVoted ? '你已经投过票了' : '投票已结束'}
          </p>
        </div>
      )}
    </div>
  );
}