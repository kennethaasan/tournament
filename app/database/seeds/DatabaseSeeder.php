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

				// $this->call('PlayersTableSeeder');
				// $this->command->info('Player table seeded!');

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
    }
}

class TournamentTableSeeder extends Seeder {

    public function run()
    {
        DB::table('tournaments')->delete();

        Tournament::create(array(
            'name' => 'Vanvikan Julecup 2016',
            'date' => '2016-12-30',
            'location' => 'Vanvikanhallen'
        ));

    }
}

class TeamsTableSeeder extends Seeder {

    public function run()
    {
        DB::table('teams')->delete();

        Team::create(array('name' => 'Ungkaran2.0', 'group_code' => 'A'));
        Team::create(array('name' => 'SGG', 'group_code' => 'A'));
        Team::create(array('name' => 'Jumboflyers', 'group_code' => 'A'));
        Team::create(array('name' => 'Rakata', 'group_code' => 'A'));
        Team::create(array('name' => 'FC Glæfs', 'group_code' => 'A'));

        Team::create(array('name' => 'Kråkvåg IL', 'group_code' => 'B'));
        Team::create(array('name' => 'Ressa BK', 'group_code' => 'B'));
        Team::create(array('name' => 'Luka FC', 'group_code' => 'B'));
        Team::create(array('name' => 'Angry cocks & the lost balls', 'group_code' => 'B'));
        Team::create(array('name' => 'Hil/fil gubbelag', 'group_code' => 'B'));

        Team::create(array('name' => 'Team Fjeldvær', 'group_code' => 'C'));
        Team::create(array('name' => 'Hamarstrand Curlingklubb', 'group_code' => 'C'));
        Team::create(array('name' => 'Heimdal Lost Elites', 'group_code' => 'C'));
        Team::create(array('name' => 'RFSU', 'group_code' => 'C'));
        Team::create(array('name' => 'fc taliban', 'group_code' => 'C'));

        Team::create(array('name' => 'Skrtel\'s', 'group_code' => 'D'));
        Team::create(array('name' => '50 Shades O\'shea', 'group_code' => 'D'));
        Team::create(array('name' => 'Diabys', 'group_code' => 'D'));
        Team::create(array('name' => 'Liggeunderlaget FC', 'group_code' => 'D'));
        Team::create(array('name' => 'Jomar & Co', 'group_code' => 'D'));

				Team::create(array('name' => 'Best på benken', 'group_code' => 'W-A'));
        Team::create(array('name' => 'Victorious Secret', 'group_code' => 'W-A'));
        Team::create(array('name' => 'Bortelaget', 'group_code' => 'W-A'));

        Team::create(array('name' => 'Røkla', 'group_code' => 'W-B'));
        Team::create(array('name' => 'The pink ladies', 'group_code' => 'W-B'));
        Team::create(array('name' => 'FosnKosn', 'group_code' => 'W-B'));

        Team::create(array('name' => 'Vinner gruppe W-A'));
        Team::create(array('name' => '2. plass gruppe W-B'));
        Team::create(array('name' => 'Vinner gruppe W-B'));
        Team::create(array('name' => '2. plass gruppe W-A'));

        Team::create(array('name' => 'Vinner S1'));
        Team::create(array('name' => 'Vinner S2'));

				Team::create(array('name' => '3. plass W-A'));
        Team::create(array('name' => '3. plass W-B'));

        Team::create(array('name' => 'Vinner gruppe A'));
        Team::create(array('name' => '2. plass gruppe B'));
        Team::create(array('name' => 'Vinner gruppe B'));
        Team::create(array('name' => '2. plass gruppe A'));
        Team::create(array('name' => 'Vinner gruppe C'));
        Team::create(array('name' => '2. plass gruppe D'));
        Team::create(array('name' => 'Vinner gruppe D'));
        Team::create(array('name' => '2. plass gruppe C'));

        Team::create(array('name' => 'Vinner Q1'));
        Team::create(array('name' => 'Vinner Q3'));
        Team::create(array('name' => 'Vinner Q2'));
        Team::create(array('name' => 'Vinner Q4'));

        Team::create(array('name' => 'Vinner S1'));
        Team::create(array('name' => 'Vinner S2'));
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

				// 1
				// 2-3
				// 4-5

				// 2
				// 1-5
				// 3-4

				// 3
				// 1-4
				// 2-5

				// 4
				// 1-2
				// 3-5

				// 5
				// 1-3
				// 2-4

				$this->generateMatch(1, '10:00', 1, 'A', 1, 4);
				$this->generateMatch(1, '10:00', 2, 'A', 2, 5);

				$this->generateMatch(1, '10:15', 1, 'B', 1+5, 4+5);
        $this->generateMatch(1, '10:15', 2, 'B', 2+5, 5+5);

				$this->generateMatch(1, '10:30', 1, 'C', 2+10, 3+10);
        $this->generateMatch(1, '10:30', 2, 'C', 4+10, 5+10);

				$this->generateMatch(1, '10:45', 1, 'D', 1+15, 4+15);
        $this->generateMatch(1, '10:45', 2, 'D', 2+15, 5+15);

				$this->generateMatch(1, '11:00', 1, 'W-A', 1+20, 3+20);
        $this->generateMatch(1, '11:00', 2, 'W-B', 4+20, 6+20);


				$this->generateMatch(1, '11:15', 1, 'A', 1, 3);
				$this->generateMatch(1, '11:15', 2, 'A', 4, 5);

				$this->generateMatch(1, '11:30', 1, 'B', 1+5, 3+5);
				$this->generateMatch(1, '11:30', 2, 'B', 4+5, 5+5);
				//
				$this->generateMatch(1, '11:45', 1, 'C', 1+10, 5+10);
				$this->generateMatch(1, '11:45', 2, 'C', 3+10, 4+10);
				//
				$this->generateMatch(1, '12:00', 1, 'D', 1+15, 3+15);
				$this->generateMatch(1, '12:00', 2, 'D', 4+15, 5+15);
				//
				$this->generateMatch(1, '12:15', 1, 'W-A', 2+20, 1+20);
				$this->generateMatch(1, '12:15', 2, 'W-B', 5+20, 4+20);


				$this->generateMatch(1, '12:30', 1, 'A', 1, 2);
				$this->generateMatch(1, '12:30', 2, 'A', 3, 4);
				//
				$this->generateMatch(1, '12:45', 1, 'B', 1+5, 2+5);
				$this->generateMatch(1, '12:45', 2, 'B', 3+5, 4+5);
				//
				$this->generateMatch(1, '13:00', 1, 'C', 1+10, 4+10);
				$this->generateMatch(1, '13:00', 2, 'C', 2+10, 5+10);
				//
				$this->generateMatch(1, '13:15', 1, 'D', 1+15, 2+15);
				$this->generateMatch(1, '13:15', 2, 'D', 3+15, 4+15);
				//
        $this->generateMatch(1, '13:30', 1, 'W-A', 3+20, 2+20);
        $this->generateMatch(1, '13:30', 2, 'W-B', 6+20, 5+20);


				$this->generateMatch(1, '13:45', 1, 'A', 1, 5);
        $this->generateMatch(1, '13:45', 2, 'A', 2, 3);
				//
        $this->generateMatch(1, '14:00', 1, 'B', 1+5, 5+5);
        $this->generateMatch(1, '14:00', 2, 'B', 2+5, 3+5);
				//
        $this->generateMatch(1, '14:15', 1, 'C', 1+10, 2+10);
        $this->generateMatch(1, '14:15', 2, 'C', 3+10, 5+10);
				//
        $this->generateMatch(1, '14:30', 1, 'D', 1+15, 5+15);
        $this->generateMatch(1, '14:30', 2, 'D', 2+15, 3+15);

				$this->generateMatch(1, '14:45', 1, 'S1', 7+20, 8+20);
        $this->generateMatch(1, '14:45', 2, 'S2', 9+20, 10+20);


				$this->generateMatch(1, '15:00', 1, 'A', 2, 4);
				$this->generateMatch(1, '15:00', 2, 'A', 3, 5);
				//
				$this->generateMatch(1, '15:15', 1, 'B', 2+5, 4+5);
				$this->generateMatch(1, '15:15', 2, 'B', 3+5, 5+5);
				//
				$this->generateMatch(1, '15:30', 1, 'C', 1+10, 3+10);
				$this->generateMatch(1, '15:30', 2, 'C', 2+10, 4+10);
				//
				$this->generateMatch(1, '15:45', 1, 'D', 2+15, 4+15);
				$this->generateMatch(1, '15:45', 2, 'D', 3+15, 5+15);
				//
				$this->generateMatch(1, '16:00', 1, 'F', 11+20, 12+20);
				$this->generateMatch(1, '16:00', 1, 'F', 13+20, 14+20);

				$this->generateMatch(1, '16:15', 1, 'Q1', 15+20, 16+20);
        $this->generateMatch(1, '16:15', 2, 'Q2', 17+20, 18+20);

        $this->generateMatch(1, '16:30', 1, 'Q3', 19+20, 20+20);
        $this->generateMatch(1, '16:30', 2, 'Q4', 21+20, 22+20);

        $this->generateMatch(1, '16:45', 1, 'S1', 23+20, 24+20);
        $this->generateMatch(1, '16:45', 2, 'S2', 25+20, 26+20);

        $this->generateMatch(1, '17:00', 1, 'F', 27+20, 28+20);
    }

    private function generateMatch($tournament_id, $kickoff_at, $field, $match_code, $hometeam_id, $awayteam_id) {
        $faker = Faker::create();

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
