import 'package:flutter/material.dart';

class CourtsListScreen extends StatelessWidget {
  const CourtsListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Спортивные клубы'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Поиск и фильтры
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  TextField(
                    decoration: InputDecoration(
                      hintText: 'Поиск по названию или адресу',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      filled: true,
                      fillColor: Colors.grey[100],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _buildFilterChip(
                          'Теннис',
                          Icons.sports_tennis,
                          true,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildFilterChip(
                          'Футбол',
                          Icons.sports_soccer,
                          false,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildFilterChip(
                          'Баскетбол',
                          Icons.sports_basketball,
                          false,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          
          // Список кортов
          _buildCourtCard(
            context,
            name: 'Tennis Club Premium',
            address: 'ул. Спортивная, 15',
            rating: 4.8,
            reviewsCount: 127,
            priceFrom: 2500,
            imageUrl: 'tennis_club.jpg',
            distance: '2.3 км',
            sports: ['Теннис', 'Падел'],
          ),
          _buildCourtCard(
            context,
            name: 'Динамо Арена',
            address: 'пр. Мира, 88',
            rating: 4.6,
            reviewsCount: 89,
            priceFrom: 3000,
            imageUrl: 'dynamo_arena.jpg',
            distance: '3.7 км',
            sports: ['Футбол', 'Теннис'],
          ),
          _buildCourtCard(
            context,
            name: 'Sport Life',
            address: 'ул. Ленина, 45',
            rating: 4.9,
            reviewsCount: 234,
            priceFrom: 2000,
            imageUrl: 'sport_life.jpg',
            distance: '5.1 км',
            sports: ['Теннис', 'Баскетбол', 'Волейбол'],
          ),
          _buildCourtCard(
            context,
            name: 'Олимпийский',
            address: 'ул. Олимпийская, 1',
            rating: 4.7,
            reviewsCount: 156,
            priceFrom: 3500,
            imageUrl: 'olympic.jpg',
            distance: '7.2 км',
            sports: ['Все виды спорта'],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, IconData icon, bool isSelected) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: isSelected ? const Color(0xFF00A86B) : Colors.grey[200],
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 16,
            color: isSelected ? Colors.white : Colors.grey[700],
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: isSelected ? Colors.white : Colors.grey[700],
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCourtCard(
    BuildContext context, {
    required String name,
    required String address,
    required double rating,
    required int reviewsCount,
    required int priceFrom,
    required String imageUrl,
    required String distance,
    required List<String> sports,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => CourtDetailScreen(
                name: name,
                address: address,
                rating: rating,
                reviewsCount: reviewsCount,
                priceFrom: priceFrom,
                distance: distance,
                sports: sports,
              ),
            ),
          );
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Изображение
            Container(
              height: 160,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(12),
                ),
              ),
              child: Stack(
                children: [
                  Center(
                    child: Icon(
                      Icons.sports_tennis,
                      size: 60,
                      color: Colors.grey[400],
                    ),
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        distance,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            
            // Информация
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          name,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Row(
                        children: [
                          const Icon(
                            Icons.star,
                            size: 16,
                            color: Colors.amber,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            rating.toString(),
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          Text(
                            ' ($reviewsCount)',
                            style: TextStyle(
                              color: Colors.grey[600],
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    address,
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: sports.map((sport) {
                      return Chip(
                        label: Text(
                          sport,
                          style: const TextStyle(fontSize: 12),
                        ),
                        backgroundColor: const Color(0xFF00A86B).withValues(alpha: 0.1),
                        padding: EdgeInsets.zero,
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'от $priceFrom ₽/час',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF00A86B),
                        ),
                      ),
                      TextButton(
                        onPressed: () {},
                        child: const Text('Забронировать'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Экран детальной информации о корте
class CourtDetailScreen extends StatelessWidget {
  final String name;
  final String address;
  final double rating;
  final int reviewsCount;
  final int priceFrom;
  final String distance;
  final List<String> sports;

  const CourtDetailScreen({
    super.key,
    required this.name,
    required this.address,
    required this.rating,
    required this.reviewsCount,
    required this.priceFrom,
    required this.distance,
    required this.sports,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(name),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Галерея изображений
            Container(
              height: 200,
              color: Colors.grey[300],
              child: Center(
                child: Icon(
                  Icons.sports_tennis,
                  size: 80,
                  color: Colors.grey[400],
                ),
              ),
            ),
            
            // Основная информация
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(Icons.location_on, size: 16, color: Colors.grey[600]),
                      const SizedBox(width: 4),
                      Text(
                        '$address • $distance от вас',
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.star, size: 20, color: Colors.amber),
                      const SizedBox(width: 4),
                      Text(
                        '$rating',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        ' ($reviewsCount отзывов)',
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  // Виды спорта
                  const Text(
                    'Доступные виды спорта',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: sports.map((sport) {
                      return Chip(
                        label: Text(sport),
                        backgroundColor: const Color(0xFF00A86B).withValues(alpha: 0.1),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),
                  
                  // Расписание и цены
                  const Text(
                    'Расписание и цены',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          _buildScheduleRow('Будни', '07:00 - 23:00', '$priceFrom ₽/час'),
                          const Divider(),
                          _buildScheduleRow('Выходные', '08:00 - 22:00', '${priceFrom + 500} ₽/час'),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Удобства
                  const Text(
                    'Удобства',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 16,
                    runSpacing: 16,
                    children: [
                      _buildAmenity(Icons.local_parking, 'Парковка'),
                      _buildAmenity(Icons.shower, 'Душевые'),
                      _buildAmenity(Icons.checkroom, 'Раздевалки'),
                      _buildAmenity(Icons.wifi, 'Wi-Fi'),
                      _buildAmenity(Icons.local_cafe, 'Кафе'),
                      _buildAmenity(Icons.sports, 'Прокат инвентаря'),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: Row(
          children: [
            Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'от',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey,
                  ),
                ),
                Text(
                  '$priceFrom ₽/час',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF00A86B),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 16),
            Expanded(
              child: ElevatedButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Функция бронирования скоро будет доступна!'),
                      backgroundColor: Color(0xFF00A86B),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00A86B),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text(
                  'Забронировать',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScheduleRow(String period, String time, String price) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              period,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            Text(
              time,
              style: TextStyle(color: Colors.grey[600], fontSize: 14),
            ),
          ],
        ),
        Text(
          price,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            color: Color(0xFF00A86B),
          ),
        ),
      ],
    );
  }

  Widget _buildAmenity(IconData icon, String label) {
    return Column(
      children: [
        Icon(icon, color: const Color(0xFF00A86B), size: 28),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(fontSize: 12),
        ),
      ],
    );
  }
}