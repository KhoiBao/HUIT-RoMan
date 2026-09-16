using System.Collections.Generic;

namespace HUIT_RoMan.Application.Modules.Room.DTOs
{
    public class RoomTypeDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public int DefaultCapacity { get; set; }
        public int? DepartmentId { get; set; }
    }

    public class CreateRoomTypeDto
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public int DefaultCapacity { get; set; }
        public int? DepartmentId { get; set; }
    }

    public class RoomDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string RoomCode { get; set; }
        public string Building { get; set; }
        public int Capacity { get; set; }
        public string Status { get; set; }
        public int RoomTypeId { get; set; }
        public string RoomTypeName { get; set; }
    }

    public class CreateRoomDto
    {
        public string Name { get; set; }
        public string RoomCode { get; set; }
        public string Building { get; set; }
        public int Capacity { get; set; }
        public int RoomTypeId { get; set; }
    }

    public class UpdateRoomDto
    {
        public string Name { get; set; }
        public string RoomCode { get; set; }
        public string Building { get; set; }
        public int Capacity { get; set; }
        public string Status { get; set; }
        public int RoomTypeId { get; set; }
    }

    public class EquipmentDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Status { get; set; }
        public int EquipmentCategoryId { get; set; }
    }

    public class CreateEquipmentDto
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public int EquipmentCategoryId { get; set; }
    }

    public class RoomEquipmentDto
    {
        public int RoomId { get; set; }
        public string RoomName { get; set; }
        public int EquipmentId { get; set; }
        public string EquipmentName { get; set; }
        public int Quantity { get; set; }
        public string Status { get; set; }
    }

    public class AddRoomEquipmentDto
    {
        public int EquipmentId { get; set; }
        public int Quantity { get; set; }
        public string Status { get; set; }
    }
}
