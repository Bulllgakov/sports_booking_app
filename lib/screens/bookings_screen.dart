import 'package:flutter/material.dart';

class BookingsScreen extends StatelessWidget {
  const BookingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Мои бронирования'),
          bottom: const TabBar(
            indicatorColor: Colors.white,
            tabs: [
              Tab(text: 'Предстоящие'),
              Tab(text: 'Прошедшие'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            // Предстоящие бронирования
            ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildBookingCard(
                  context,
                  clubName: 'Tennis Club Premium',
                  sport: 'Теннис',
                  date: '25 июля 2025',
                  time: '18:00 - 20:00',
                  court: 'Корт №3',
                  price: 5000,
                  status: BookingStatus.confirmed,
                  isUpcoming: true,
                ),
                _buildBookingCard(
                  context,
                  clubName: 'Sport Life',
                  sport: 'Баскетбол',
                  date: '27 июля 2025',
                  time: '10:00 - 12:00',
                  court: 'Зал №1',
                  price: 4000,
                  status: BookingStatus.confirmed,
                  isUpcoming: true,
                ),
                _buildBookingCard(
                  context,
                  clubName: 'Динамо Арена',
                  sport: 'Футбол',
                  date: '30 июля 2025',
                  time: '20:00 - 22:00',
                  court: 'Поле №2',
                  price: 6000,
                  status: BookingStatus.pending,
                  isUpcoming: true,
                ),
              ],
            ),
            
            // Прошедшие бронирования
            ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildBookingCard(
                  context,
                  clubName: 'Tennis Club Premium',
                  sport: 'Теннис',
                  date: '15 июля 2025',
                  time: '14:00 - 16:00',
                  court: 'Корт №1',
                  price: 5000,
                  status: BookingStatus.completed,
                  isUpcoming: false,
                ),
                _buildBookingCard(
                  context,
                  clubName: 'Олимпийский',
                  sport: 'Волейбол',
                  date: '10 июля 2025',
                  time: '19:00 - 21:00',
                  court: 'Зал №3',
                  price: 3500,
                  status: BookingStatus.completed,
                  isUpcoming: false,
                ),
                _buildBookingCard(
                  context,
                  clubName: 'Sport Life',
                  sport: 'Теннис',
                  date: '5 июля 2025',
                  time: '08:00 - 10:00',
                  court: 'Корт №2',
                  price: 4000,
                  status: BookingStatus.cancelled,
                  isUpcoming: false,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBookingCard(
    BuildContext context, {
    required String clubName,
    required String sport,
    required String date,
    required String time,
    required String court,
    required int price,
    required BookingStatus status,
    required bool isUpcoming,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        clubName,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        sport,
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
                _buildStatusBadge(status),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(),
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(Icons.calendar_today, size: 16, color: Colors.grey[600]),
                const SizedBox(width: 8),
                Text(date),
                const SizedBox(width: 16),
                Icon(Icons.access_time, size: 16, color: Colors.grey[600]),
                const SizedBox(width: 8),
                Text(time),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.location_on, size: 16, color: Colors.grey[600]),
                const SizedBox(width: 8),
                Text(court),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '$price ₽',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF00A86B),
                  ),
                ),
                if (isUpcoming && status == BookingStatus.confirmed)
                  Row(
                    children: [
                      TextButton(
                        onPressed: () => _showComingSoon(context),
                        child: const Text('Отменить'),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.red,
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: () => _showComingSoon(context),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF00A86B),
                        ),
                        child: const Text('QR-код'),
                      ),
                    ],
                  )
                else if (!isUpcoming && status == BookingStatus.completed)
                  TextButton(
                    onPressed: () => _showComingSoon(context),
                    child: const Text('Повторить'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(BookingStatus status) {
    Color color;
    String text;
    
    switch (status) {
      case BookingStatus.confirmed:
        color = Colors.green;
        text = 'Подтверждено';
        break;
      case BookingStatus.pending:
        color = Colors.orange;
        text = 'Ожидает';
        break;
      case BookingStatus.cancelled:
        color = Colors.red;
        text = 'Отменено';
        break;
      case BookingStatus.completed:
        color = Colors.blue;
        text = 'Завершено';
        break;
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  void _showComingSoon(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Эта функция скоро будет доступна!'),
        backgroundColor: Color(0xFF00A86B),
      ),
    );
  }
}

enum BookingStatus {
  confirmed,
  pending,
  cancelled,
  completed,
}