<?php


use \Faker\Factory as Faker;

class DatabaseSeeder extends Seeder {

		/**
		 * Run the database seeds.
		 *
		 * @return void
		 */
		public function run()
		{
				Eloquent::unguard();

				$this->call('UserTableSeeder');
				$this->command->info('User table seeded!');

				$this->call('TournamentTableSeeder');
				$this->command->info('Tournament table seeded!');

				$this->call('TeamsTableSeeder');
				$this->command->info('Team table seeded!');

				//$this->call('PlayersTableSeeder');
				//$this->command->info('Player table seeded!');

				$this->call('MatchesTableSeeder');
				$this->command->info('Match table seeded!');

				//$this->call('GoalsTableSeeder');
				//$this->command->info('Goal table seeded!');

		}
}

class UserTableSeeder extends Seeder {

    public function run()
    {
        DB::table('users')->delete();

        User::create(array(
            'email' => 'admin@admin.no',
            'password' => Hash::make('admin'),
            'admin' => true
        ));

        User::create(array(
            'email' => 'admin2@admin2.no',
            'password' => Hash::make('admin2'),
            'admin' => true
        ));


        /*$faker = Faker::create();

        foreach (range(1, 47) as $index) {
            User::create(array(
                'email' => $faker->email(),
                'password' => Hash::make($faker->word(10)),
                'teacher' => false
            ));
        }*/

    }
}

class TournamentTableSeeder extends Seeder {

    public function run()
    {
        DB::table('tournaments')->delete();

        Tournament::create(array(
            'name' => 'Vanvikan Indoor 2025 G14',
            'date' => '2025-02-22',
            'location' => 'Vanvikanhallen'
        ));

        Tournament::create(array(
          'name' => 'Vanvikan Indoor 2025 G16',
          'date' => '2025-02-22',
          'location' => 'Vanvikanhallen'
        ));

        Tournament::create(array(
            'name' => 'Vanvikan Indoor 2025 J14',
            'date' => '2025-02-23',
            'location' => 'Vanvikanhallen'
        ));

        Tournament::create(array(
          'name' => 'Vanvikan Indoor 2025 J17',
          'date' => '2025-02-23',
          'location' => 'Vanvikanhallen'
        ));

    }
}

class TeamsTableSeeder extends Seeder {

    public function run()
    {
        DB::table('teams')->delete();

        $teams = [
            'A' => [
                // G14
                'Stadsbygd/Vanvik/Rissa 1',
                'Åfjord 2',
                'Inderøy 2',
                'Melhus/Gauldal 3',

                // G16
                'Rissa/Stadsbygd/Vanvik 1',
                'Oppdal 3',
                'Åfjord',
                'Klæbu',
                'Romolslia 2',

                // J14
                'Vanvik/Stadsbygd/Rissa 1',
                'Nidelv/Utleira 2',
                'Melhus 2',
                'Stjørna/Hil/Fevåg',
                'Tiller',

                // J17
                // Duplicate team name from above
                // 'Vanvik/Stadsbygd/Rissa 1',
                'Romolslia',
                'FK Fosen 1',
                'FK Fosen 2',
                'Leksvik'
            ],
            'B' => [
                // G14
                'Stadsbygd/Vanvik/Rissa 2',
                'Afjord 1',
                'Sokna 1',
                'Melhus/Gauldal 2',

                // G16
                'Rissa/Stadsbygd/Vanvik 3',
                'Oppdal 1',
                'Stjørna/Hil/Fevåg 2',
                'FK Fosen 2',

                // J14
                'Vanvik/Stadsbygd/Rissa 2',
                'Nidelv/Utleira 1',
                'Melhus 1',
                'Melhus 3',
                'Lensvik',
            ],
            'C' => [
                // G14
                'Sokna 2',
                'Inderøy 1',
                'Melhus/Gauldal 4',
                'Melhus/Gauldal 1',

                // G16
                'Rissa/Stadsbygd/Vanvik 2',
                'Oppdal 2',
                'Stjørna/Hil/Fevåg 1',
                'FK Fosen 1',
                'Romolslia 1',
            ],
        ];

        foreach ($teams as $group => $teamNames) {
            foreach ($teamNames as $teamName) {
                Team::create([
                    'name' => $teamName,
                    'group_code' => $group,
                ]);
            }
        }

        $placeholderTeams = [
            'Vinner gruppe A',
            'Vinner gruppe B',
            'Vinner gruppe C',
            'Vinner gruppe D',
            'Beste toer',
            '2. plass gruppe A',
            '2. plass gruppe B',
            '3. plass gruppe A',
            '4. plass gruppe A',
            'Vinner SF1',
            'Vinner SF2',
            'Tapende lag SF1',
            'Tapende lag SF2'
        ];

        foreach ($placeholderTeams as $teamName) {
            Team::create(array('name' => $teamName));
        }

    }
}

class PlayersTableSeeder extends Seeder {

    public function run()
    {
        DB::table('players')->delete();

        $faker = Faker::create();

        foreach (range(1, 200) as $index) {
            Player::create(array(
                'name' => $faker->name(),
                'number' => $faker->numberBetween(1, 99),
                'paid' => $faker->boolean(),
                'team_id' => $faker->numberBetween(1, 25)
            ));
        }

    }
}

class MatchesTableSeeder extends Seeder {

    public function run() {

        DB::table('matches')->delete();

        $g14Matches = [
            [
                'time' => '09:00',
                'field' => 1,
                'group' => 'A',
                'homeTeam' => 'Stadsbygd/Vanvik/Rissa 1',
                'awayTeam' => 'Åfjord 2'
            ],
            [
                'time' => '09:00',
                'field' => 2,
                'group' => 'B',
                'homeTeam' => 'Stadsbygd/Vanvik/Rissa 2',
                'awayTeam' => 'Åfjord 1'
            ],
            [
                'time' => '09:20',
                'field' => 1,
                'group' => 'A',
                'homeTeam' => 'Inderøy 2',
                'awayTeam' => 'Melhus/Gauldal 3'
            ],
            [
                'time' => '09:20',
                'field' => 2,
                'group' => 'B',
                'homeTeam' => 'Sokna 1',
                'awayTeam' => 'Melhus/Gauldal 2'
            ],
            [
                'time' => '09:40',
                'field' => 1,
                'group' => 'C',
                'homeTeam' => 'Sokna 2',
                'awayTeam' => 'Inderøy 1'
            ],
            [
                'time' => '09:40',
                'field' => 2,
                'group' => 'C',
                'homeTeam' => 'Melhus/Gauldal 4',
                'awayTeam' => 'Melhus/Gauldal 1'
            ],
            [
                'time' => '10:00',
                'field' => 1,
                'group' => 'A',
                'homeTeam' => 'Åfjord 2',
                'awayTeam' => 'Inderøy 2'
            ],
            [
                'time' => '10:00',
                'field' => 2,
                'group' => 'A',
                'homeTeam' => 'Melhus/Gauldal 3',
                'awayTeam' => 'Stadsbygd/Vanvik/Rissa 1'
            ],
            [
                'time' => '10:20',
                'field' => 1,
                'group' => 'B',
                'homeTeam' => 'Åfjord 1',
                'awayTeam' => 'Sokna 1'
            ],
            [
                'time' => '10:20',
                'field' => 2,
                'group' => 'B',
                'homeTeam' => 'Melhus/Gauldal 2',
                'awayTeam' => 'Stadsbygd/Vanvik/Rissa 2'
            ],
            [
                'time' => '10:40',
                'field' => 1,
                'group' => 'C',
                'homeTeam' => 'Inderøy 1',
                'awayTeam' => 'Melhus/Gauldal 4'
            ],
            [
                'time' => '10:40',
                'field' => 2,
                'group' => 'C',
                'homeTeam' => 'Melhus/Gauldal 1',
                'awayTeam' => 'Sokna 2'
            ],
            [
                'time' => '11:00',
                'field' => 1,
                'group' => 'A',
                'homeTeam' => 'Stadsbygd/Vanvik/Rissa 1',
                'awayTeam' => 'Inderøy 2'
            ],
            [
                'time' => '11:00',
                'field' => 2,
                'group' => 'A',
                'homeTeam' => 'Melhus/Gauldal 3',
                'awayTeam' => 'Åfjord 2'
            ],
            [
                'time' => '11:20',
                'field' => 1,
                'group' => 'B',
                'homeTeam' => 'Stadsbygd/Vanvik/Rissa 2',
                'awayTeam' => 'Sokna 1'
            ],
            [
                'time' => '11:20',
                'field' => 2,
                'group' => 'B',
                'homeTeam' => 'Melhus/Gauldal 2',
                'awayTeam' => 'Åfjord 1'
            ],
            [
                'time' => '11:40',
                'field' => 1,
                'group' => 'C',
                'homeTeam' => 'Sokna 2',
                'awayTeam' => 'Melhus/Gauldal 4'
            ],
            [
                'time' => '11:40',
                'field' => 2,
                'group' => 'C',
                'homeTeam' => 'Melhus/Gauldal 1',
                'awayTeam' => 'Inderøy 1'
            ],
            [
                'time' => '12:10',
                'field' => 1,
                'group' => 'S1',
                'homeTeam' => 'Vinner gruppe A',
                'awayTeam' => 'Vinner gruppe B'
            ],
            [
                'time' => '12:10',
                'field' => 2,
                'group' => 'S2',
                'homeTeam' => 'Vinner gruppe C',
                'awayTeam' => 'Beste toer'
            ],
            [
                'time' => '12:40',
                'field' => 1,
                'group' => 'F',
                'homeTeam' => 'Vinner SF1',
                'awayTeam' => 'Vinner SF2'
            ],
            [
                'time' => '12:40',
                'field' => 2,
                'group' => 'BF',
                'homeTeam' => 'Tapende lag SF1',
                'awayTeam' => 'Tapende lag SF2'
            ],
        ];

        $g16Matches = [
            [
                'time' => '13:20',
                'field' => 1,
                'group' => 'A',
                'homeTeam' => 'Rissa/Stadsbygd/Vanvik 1',
                'awayTeam' => 'Oppdal 3'
            ],
            [
                'time' => '13:20',
                'field' => 2,
                'group' => 'B',
                'homeTeam' => 'Rissa/Stadsbygd/Vanvik 3',
                'awayTeam' => 'Oppdal 1'
            ],
            [
                'time' => '13:40',
                'field' => 1,
                'group' => 'C',
                'homeTeam' => 'Rissa/Stadsbygd/Vanvik 2',
                'awayTeam' => 'Oppdal 2'
            ],
            [
                'time' => '13:40',
                'field' => 2,
                'group' => 'A',
                'homeTeam' => 'Klæbu',
                'awayTeam' => 'Åfjord'
            ],
            [
                'time' => '14:00',
                'field' => 1,
                'group' => 'C',
                'homeTeam' => 'FK Fosen 1',
                'awayTeam' => 'Stjørna/Hil/Fevåg 1'
            ],
            [
                'time' => '14:00',
                'field' => 2,
                'group' => 'A',
                'homeTeam' => 'Romolslia 2',
                'awayTeam' => 'Rissa/Stadsbygd/Vanvik 1'
            ],
            [
                'time' => '14:20',
                'field' => 1,
                'group' => 'B',
                'homeTeam' => 'FK Fosen 2',
                'awayTeam' => 'Rissa/Stadsbygd/Vanvik 3'
            ],
            [
                'time' => '14:20',
                'field' => 2,
                'group' => 'C',
                'homeTeam' => 'Romolslia 1',
                'awayTeam' => 'Rissa/Stadsbygd/Vanvik 2'
            ],
            [
                'time' => '14:40',
                'field' => 1,
                'group' => 'A',
                'homeTeam' => 'Oppdal 3',
                'awayTeam' => 'Klæbu'
            ],
            [
                'time' => '14:40',
                'field' => 2,
                'group' => 'B',
                'homeTeam' => 'Oppdal 1',
                'awayTeam' => 'Stjørna/Hil/Fevåg 2'
            ],
            [
                'time' => '15:00',
                'field' => 1,
                'group' => 'C',
                'homeTeam' => 'Oppdal 2',
                'awayTeam' => 'FK Fosen 1'
            ],
            [
                'time' => '15:00',
                'field' => 2,
                'group' => 'A',
                'homeTeam' => 'Romolslia 2',
                'awayTeam' => 'Åfjord'
            ],
            [
                'time' => '15:20',
                'field' => 1,
                'group' => 'C',
                'homeTeam' => 'Romolslia 1',
                'awayTeam' => 'Stjørna/Hil/Fevåg 1'
            ],
            [
                'time' => '15:20',
                'field' => 2,
                'group' => 'A',
                'homeTeam' => 'Rissa/Stadsbygd/Vanvik 1',
                'awayTeam' => 'Klæbu'
            ],
            [
                'time' => '15:40',
                'field' => 1,
                'group' => 'B',
                'homeTeam' => 'Rissa/Stadsbygd/Vanvik 3',
                'awayTeam' => 'Stjørna/Hil/Fevåg 2'
            ],
            [
                'time' => '15:40',
                'field' => 2,
                'group' => 'C',
                'homeTeam' => 'Rissa/Stadsbygd/Vanvik 2',
                'awayTeam' => 'FK Fosen 1'
            ],
            [
                'time' => '16:00',
                'field' => 1,
                'group' => 'A',
                'homeTeam' => 'Åfjord',
                'awayTeam' => 'Oppdal 3'
            ],
            [
                'time' => '16:00',
                'field' => 2,
                'group' => 'C',
                'homeTeam' => 'Stjørna/Hil/Fevåg 1',
                'awayTeam' => 'Oppdal 2'
            ],
            [
                'time' => '16:20',
                'field' => 1,
                'group' => 'A',
                'homeTeam' => 'Klæbu',
                'awayTeam' => 'Romolslia 2'
            ],
            [
                'time' => '16:20',
                'field' => 2,
                'group' => 'B',
                'homeTeam' => 'Stjørna/Hil/Fevåg 2',
                'awayTeam' => 'FK Fosen 2'
            ],
            [
                'time' => '16:40',
                'field' => 1,
                'group' => 'C',
                'homeTeam' => 'FK Fosen 1',
                'awayTeam' => 'Romolslia 1'
            ],
            [
                'time' => '16:40',
                'field' => 2,
                'group' => 'A',
                'homeTeam' => 'Åfjord',
                'awayTeam' => 'Rissa/Stadsbygd/Vanvik 1'
            ],
            [
                'time' => '17:00',
                'field' => 1,
                'group' => 'C',
                'homeTeam' => 'Stjørna/Hil/Fevåg 1',
                'awayTeam' => 'Rissa/Stadsbygd/Vanvik 2'
            ],
            [
                'time' => '17:00',
                'field' => 2,
                'group' => 'A',
                'homeTeam' => 'Oppdal 3',
                'awayTeam' => 'Romolslia 2'
            ],
            [
                'time' => '17:20',
                'field' => 1,
                'group' => 'B',
                'homeTeam' => 'Oppdal 1',
                'awayTeam' => 'FK Fosen 2'
            ],
            [
                'time' => '17:20',
                'field' => 2,
                'group' => 'C',
                'homeTeam' => 'Oppdal 2',
                'awayTeam' => 'Romolslia 1'
            ],
            [
                'time' => '17:40',
                'field' => 1,
                'group' => 'S1',
                'homeTeam' => 'Vinner gruppe A',
                'awayTeam' => 'Vinner gruppe B'
            ],
            [
                'time' => '17:40',
                'field' => 2,
                'group' => 'S2',
                'homeTeam' => 'Vinner gruppe C',
                'awayTeam' => 'Beste toer'
            ],
            [
                'time' => '18:10',
                'field' => 1,
                'group' => 'F',
                'homeTeam' => 'Vinner SF1',
                'awayTeam' => 'Vinner SF2'
            ],
            [
                'time' => '18:10',
                'field' => 2,
                'group' => 'BF',
                'homeTeam' => 'Tapende lag SF1',
                'awayTeam' => 'Tapende lag SF2'
            ]
        ];

        $j14Matches = [
            [
                'time' => '09:20',
                'field' => 1,
                'group' => 'B',
                'homeTeam' => 'Vanvik/Stadsbygd/Rissa 2',
                'awayTeam' => 'Nidelv/Utleira 1'
            ],
            [
                'time' => '09:20',
                'field' => 2,
                'group' => 'B',
                'homeTeam' => 'Melhus 1',
                'awayTeam' => 'Melhus 3'
            ],
            [
                'time' => '09:40',
                'field' => 1,
                'group' => 'A',
                'homeTeam' => 'Vanvik/Stadsbygd/Rissa 1',
                'awayTeam' => 'Nidelv/Utleira 2'
            ],
            [
                'time' => '09:40',
                'field' => 2,
                'group' => 'A',
                'homeTeam' => 'Melhus 2',
                'awayTeam' => 'Stjørna/Hil/Fevåg'
            ],
            [
                'time' => '10:00',
                'field' => 1,
                'group' => 'B',
                'homeTeam' => 'Lensvik',
                'awayTeam' => 'Vanvik/Stadsbygd/Rissa 2'
            ],
            [
                'time' => '10:00',
                'field' => 2,
                'group' => 'B',
                'homeTeam' => 'Nidelv/Utleira 1',
                'awayTeam' => 'Melhus 1'
            ],
            [
                'time' => '10:20',
                'field' => 1,
                'group' => 'A',
                'homeTeam' => 'Tiller',
                'awayTeam' => 'Vanvik/Stadsbygd/Rissa 1'
            ],
            [
                'time' => '10:20',
                'field' => 2,
                'group' => 'A',
                'homeTeam' => 'Nidelv/Utleira 2',
                'awayTeam' => 'Melhus 2'
            ],
            [
                'time' => '10:40',
                'field' => 1,
                'group' => 'B',
                'homeTeam' => 'Melhus 3',
                'awayTeam' => 'Lensvik'
            ],
            [
                'time' => '10:40',
                'field' => 2,
                'group' => 'B',
                'homeTeam' => 'Vanvik/Stadsbygd/Rissa 2',
                'awayTeam' => 'Melhus 1'
            ],
            [
                'time' => '11:00',
                'field' => 1,
                'group' => 'A',
                'homeTeam' => 'Stjørna/Hil/Fevåg',
                'awayTeam' => 'Tiller'
            ],
            [
                'time' => '11:00',
                'field' => 2,
                'group' => 'A',
                'homeTeam' => 'Vanvik/Stadsbygd/Rissa 1',
                'awayTeam' => 'Melhus 2'
            ],
            [
                'time' => '11:20',
                'field' => 1,
                'group' => 'B',
                'homeTeam' => 'Lensvik',
                'awayTeam' => 'Nidelv/Utleira 1'
            ],
            [
                'time' => '11:20',
                'field' => 2,
                'group' => 'B',
                'homeTeam' => 'Melhus 3',
                'awayTeam' => 'Vanvik/Stadsbygd/Rissa 2'
            ],
            [
                'time' => '12:00',
                'field' => 1,
                'group' => 'A',
                'homeTeam' => 'Tiller',
                'awayTeam' => 'Nidelv/Utleira 2'
            ],
            [
                'time' => '12:00',
                'field' => 2,
                'group' => 'A',
                'homeTeam' => 'Stjørna/Hil/Fevåg',
                'awayTeam' => 'Vanvik/Stadsbygd/Rissa 1'
            ],
            [
                'time' => '12:40',
                'field' => 1,
                'group' => 'B',
                'homeTeam' => 'Nidelv/Utleira 1',
                'awayTeam' => 'Melhus 3'
            ],
            [
                'time' => '12:40',
                'field' => 2,
                'group' => 'B',
                'homeTeam' => 'Melhus 1',
                'awayTeam' => 'Lensvik'
            ],
            [
                'time' => '13:20',
                'field' => 1,
                'group' => 'A',
                'homeTeam' => 'Nidelv/Utleira 2',
                'awayTeam' => 'Stjørna/Hil/Fevåg'
            ],
            [
                'time' => '13:20',
                'field' => 2,
                'group' => 'A',
                'homeTeam' => 'Melhus 2',
                'awayTeam' => 'Tiller'
            ],
            [
                'time' => '14:00',
                'field' => 1,
                'group' => 'S1',
                'homeTeam' => 'Vinner gruppe A',
                'awayTeam' => '2. plass gruppe B'
            ],
            [
                'time' => '14:00',
                'field' => 2,
                'group' => 'S2',
                'homeTeam' => 'Vinner gruppe B',
                'awayTeam' => '2. plass gruppe A'
            ],
            [
                'time' => '14:40',
                'field' => 1,
                'group' => 'F',
                'homeTeam' => 'Vinner SF1',
                'awayTeam' => 'Vinner SF2'
            ],
            [
                'time' => '14:40',
                'field' => 2,
                'group' => 'BF',
                'homeTeam' => 'Tapende lag SF1',
                'awayTeam' => 'Tapende lag SF2'
            ]
        ];

        $j17Matches = [
            [
                'time' => '11:40',
                'field' => 1,
                'group' => 'A',
                'homeTeam' => 'Vanvik/Stadsbygd/Rissa 1',
                'awayTeam' => 'Romolslia'
            ],
            [
                'time' => '11:40',
                'field' => 2,
                'group' => 'A',
                'homeTeam' => 'FK Fosen 1',
                'awayTeam' => 'FK Fosen 2'
            ],
            [
                'time' => '12:20',
                'field' => 1,
                'group' => 'A',
                'homeTeam' => 'Leksvik',
                'awayTeam' => 'Vanvik/Stadsbygd/Rissa 1'
            ],
            [
                'time' => '12:20',
                'field' => 2,
                'group' => 'A',
                'homeTeam' => 'Romolslia',
                'awayTeam' => 'FK Fosen 1'
            ],
            [
                'time' => '13:00',
                'field' => 1,
                'group' => 'A',
                'homeTeam' => 'FK Fosen 2',
                'awayTeam' => 'Leksvik'
            ],
            [
                'time' => '13:00',
                'field' => 2,
                'group' => 'A',
                'homeTeam' => 'Vanvik/Stadsbygd/Rissa 1',
                'awayTeam' => 'FK Fosen 1'
            ],
            [
                'time' => '13:40',
                'field' => 1,
                'group' => 'A',
                'homeTeam' => 'Romolslia',
                'awayTeam' => 'Leksvik'
            ],
            [
                'time' => '13:40',
                'field' => 2,
                'group' => 'A',
                'homeTeam' => 'FK Fosen 2',
                'awayTeam' => 'Vanvik/Stadsbygd/Rissa 1'
            ],
            [
                'time' => '14:20',
                'field' => 1,
                'group' => 'A',
                'homeTeam' => 'Romolslia',
                'awayTeam' => 'FK Fosen 2'
            ],
            [
                'time' => '14:20',
                'field' => 2,
                'group' => 'A',
                'homeTeam' => 'Leksvik',
                'awayTeam' => 'FK Fosen 1'
            ],
            [
                'time' => '15:00',
                'field' => 1,
                'group' => 'F',
                'homeTeam' => 'Vinner gruppe A',
                'awayTeam' => '2. plass gruppe A'
            ],
            [
                'time' => '15:00',
                'field' => 2,
                'group' => 'BF',
                'homeTeam' => '3. plass gruppe A',
                'awayTeam' => '4. plass gruppe A'
            ]
        ];

        $this->generateMatches(1, $g14Matches);
        $this->generateMatches(2, $g16Matches);
        $this->generateMatches(3, $j14Matches);
        $this->generateMatches(4, $j17Matches);
    }

    private function getTeamId($teamName, $groupCode) {
        if (in_array($groupCode, ['A', 'B', 'C', 'D', 'E', 'W'])) {
            $team = Team::where('name', $teamName)
                ->where('group_code', $groupCode)
                ->first();
        } else {
            $team = Team::where('name', $teamName)->first();
        }

        if (!$team) {
            echo 'Could not find team: ' . $teamName . "\n";
            throw new Exception('Could not find team: ' . $teamName);
        }
        
        return $team;
    }

    private function generateMatches($tournament_id, $matches) {
        foreach ($matches as $match) {
            $homeTeam = $this->getTeamId($match['homeTeam'], $match['group']);
            $awayTeam = $this->getTeamId($match['awayTeam'], $match['group']);
            
            echo $homeTeam->name . ' vs ' . $awayTeam->name . "\n";
            echo $homeTeam->id . ' vs ' . $awayTeam->id . "\n";

            if (!$homeTeam) {
                echo 'Could not find home team: ' . $match['homeTeam'] . "\n";
                throw new Exception('Could not find home team: ' . $match['homeTeam']);
            }

            if (!$awayTeam) {
                echo 'Could not find away team: ' . $match['awayTeam'] . "\n";
                throw new Exception('Could not find away team: ' . $match['awayTeam']);
            }

            $this->generateMatch(
                $tournament_id, 
                $match['time'], 
                $match['field'], 
                $match['group'], 
                $homeTeam->id,
                $awayTeam->id
            );
        }
    }

    private function generateMatch($tournament_id, $kickoff_at, $field, $match_code, $hometeam_id, $awayteam_id) {
        Match::create(array(
            'tournament_id' => $tournament_id,
            'kickoff_at'    => $kickoff_at,
            'field'         => $field,
            'match_code'    => $match_code,
            'hometeam_id'   => $hometeam_id,
            'awayteam_id'   => $awayteam_id,
            'score_home'    => null,
            'score_away'    => null
        ));
    }
}

class GoalsTableSeeder extends Seeder {

    public function run() {

        DB::table('goals')->delete();

        $faker = Faker::create();

        foreach (range(1, 100) as $index) {
            Goal::create(array(
                'match_id'      => $faker->numberBetween(1, 25),
                'player_id'     => $faker->numberBetween(1, 100)
            ));
        }
    }
}
