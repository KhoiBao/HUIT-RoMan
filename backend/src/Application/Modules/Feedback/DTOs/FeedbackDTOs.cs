using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HUIT_RoMan.Application.Modules.Feedback.DTOs
{
    public class CreateFeedbackDto
    {
        public int? UsageSessionId { get; set; }
        public int? BookingId { get; set; }

        [Range(1, 5, ErrorMessage = "Đánh giá phải từ 1 đến 5 sao.")]
        public int Rating { get; set; }

        [MaxLength(2000, ErrorMessage = "Nội dung phản hồi không được vượt quá 2000 ký tự.")]
        public string? Comment { get; set; }
    }

    public class FeedbackDto
    {
        public int Id { get; set; }
        public int Rating { get; set; }
        public string Comment { get; set; } = string.Empty;
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string UserCardCode { get; set; } = string.Empty;
        public int UsageSessionId { get; set; }
        public int? BookingId { get; set; }
        public int? RoomId { get; set; }
        public string RoomName { get; set; } = string.Empty;
        public DateTime? StartAt { get; set; }
        public DateTime? EndAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class FeedbackListDto
    {
        public int TotalCount { get; set; }
        public double AverageRating { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public List<FeedbackDto> Items { get; set; } = new List<FeedbackDto>();
    }

    public class RoomFeedbackSummaryDto
    {
        public int RoomId { get; set; }
        public string RoomName { get; set; } = string.Empty;
        public double AverageRating { get; set; }
        public int TotalFeedbacks { get; set; }
        public int Star1Count { get; set; }
        public int Star2Count { get; set; }
        public int Star3Count { get; set; }
        public int Star4Count { get; set; }
        public int Star5Count { get; set; }
    }
}

