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
            'name' => 'Vanvikan Julecup 2019',
            'date' => '2019-12-30',
            'location' => 'Vanvikanhallen'
        ));

    }
}

class TeamsTableSeeder extends Seeder {

    public function run()
    {
        DB::table('teams')->delete();

        // Finals
        Team::create(array('name' => 'Vinner gruppe A')); // 1
        Team::create(array('name' => '2. plass gruppe A'));
        Team::create(array('name' => 'Vinner gruppe B')); // 3
        Team::create(array('name' => '2. plass gruppe B'));
        Team::create(array('name' => 'Vinner gruppe C')); // 5
        Team::create(array('name' => '2. plass gruppe C'));
        Team::create(array('name' => 'Vinner gruppe D')); // 7
        Team::create(array('name' => '2. plass gruppe D'));

        Team::create(array('name' => 'Vinner Q1')); // 9
        Team::create(array('name' => 'Vinner Q2')); 
        Team::create(array('name' => 'Vinner Q3')); // 11
        Team::create(array('name' => 'Vinner Q4'));

        Team::create(array('name' => 'Vinner S1')); // 13
        Team::create(array('name' => 'Vinner S2'));

        Team::create(array('name' => 'Vinner gruppe W-A')); // 15
        Team::create(array('name' => '2. plass gruppe W-A'));

        // Men
        Team::create(array('name' => 'Ressa BK 2', 'group_code' => 'A'));

        Team::create(array('name' => 'Kjeks & Ballmiss', 'group_code' => 'A'));
        Team::create(array('name' => 'Hælvhardt Pinnkjøtt', 'group_code' => 'A'));
        Team::create(array('name' => 'SGG', 'group_code' => 'A'));
        Team::create(array('name' => 'Ralljballj', 'group_code' => 'A'));

        Team::create(array('name' => 'Lydmaskin Rolog', 'group_code' => 'B'));
        Team::create(array('name' => 'Patetico Madrid', 'group_code' => 'B'));
        Team::create(array('name' => 'Paralympiakos', 'group_code' => 'B'));
        Team::create(array('name' => 'Drøyeste Laget', 'group_code' => 'B'));

        Team::create(array('name' => 'Ressa BK', 'group_code' => 'C'));
        Team::create(array('name' => 'Team Ness&Waterloo', 'group_code' => 'C'));
        Team::create(array('name' => 'Flerkulturelt', 'group_code' => 'C'));
        Team::create(array('name' => '5 Stars', 'group_code' => 'C'));

        Team::create(array('name' => '50 Shades of O\'Shea', 'group_code' => 'D'));
        Team::create(array('name' => 'Chicken Tiki Taka', 'group_code' => 'D'));
        Team::create(array('name' => 'Voltarol Spritz', 'group_code' => 'D'));
        Team::create(array('name' => 'Underdogs', 'group_code' => 'D'));

        // Women
        Team::create(array('name' => 'Blodig Alvor', 'group_code' => 'W-A'));
        Team::create(array('name' => 'Fosnkosn', 'group_code' => 'W-A'));
        Team::create(array('name' => 'Tikka Mo Salah', 'group_code' => 'W-A'));
        Team::create(array('name' => 'Ibrahimobitch', 'group_code' => 'W-A'));
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

        $tournament_id = 1;
        $men_team_id = 18;
        $women_team_id = $men_team_id + 16;

        $this->generateMatch($tournament_id, '10:00', 1, 'A', $men_team_id, $men_team_id + 1); 
        $this->generateMatch($tournament_id, '10:00', 2, 'A', $men_team_id + 2, $men_team_id + 3); // - 1
        $this->generateMatch($tournament_id, '10:20', 1, 'B', $men_team_id + 4, $men_team_id + 5);
        $this->generateMatch($tournament_id, '10:20', 2, 'B', $men_team_id + 6, $men_team_id + 7);
        $this->generateMatch($tournament_id, '10:40', 1, 'A', $men_team_id - 1, $men_team_id + 2);
        $this->generateMatch($tournament_id, '10:40', 2, 'A', $men_team_id + 1, $men_team_id + 3); // 0
        $this->generateMatch($tournament_id, '11:00', 1, 'C', $men_team_id + 8, $men_team_id + 9);
        $this->generateMatch($tournament_id, '11:00', 2, 'C', $men_team_id + 10, $men_team_id + 11);
        $this->generateMatch($tournament_id, '11:20', 1, 'A', $men_team_id - 1, $men_team_id + 3);
        $this->generateMatch($tournament_id, '11:20', 2, 'A', $men_team_id + 2, $men_team_id); // + 1
        $this->generateMatch($tournament_id, '11:40', 1, 'D', $men_team_id + 12, $men_team_id + 13);
        $this->generateMatch($tournament_id, '11:40', 2, 'D', $men_team_id + 14, $men_team_id + 15);
        $this->generateMatch($tournament_id, '12:00', 1, 'W-A', $women_team_id, $women_team_id + 1);
        $this->generateMatch($tournament_id, '12:00', 2, 'W-A', $women_team_id + 2, $women_team_id + 3);

        $this->generateMatch($tournament_id, '12:20', 1, 'A', $men_team_id + 1, $men_team_id - 1);
        $this->generateMatch($tournament_id, '12:20', 2, 'A', $men_team_id, $men_team_id + 3); // + 2
        $this->generateMatch($tournament_id, '12:40', 1, 'B', $men_team_id + 1 + 4, $men_team_id + 2 + 4);
        $this->generateMatch($tournament_id, '12:40', 2, 'B', $men_team_id + 3 + 4, $men_team_id + 4);
        $this->generateMatch($tournament_id, '13:00', 1, 'C', $men_team_id + 1 + 8, $men_team_id + 2 + 8);
        $this->generateMatch($tournament_id, '13:00', 2, 'C', $men_team_id + 3 + 8, $men_team_id + 8);
        $this->generateMatch($tournament_id, '13:20', 1, 'D', $men_team_id + 1 + 12, $men_team_id + 2 + 12);
        $this->generateMatch($tournament_id, '13:20', 2, 'D', $men_team_id + 3 + 12, $men_team_id + 12);
        $this->generateMatch($tournament_id, '13:40', 1, 'W-A', $women_team_id + 1, $women_team_id + 2);
        $this->generateMatch($tournament_id, '13:40', 2, 'W-A', $women_team_id + 3, $women_team_id);

        $this->generateMatch($tournament_id, '14:00', 1, 'A', $men_team_id + 1, $men_team_id + 2);
        $this->generateMatch($tournament_id, '14:00', 2, 'A', $men_team_id, $men_team_id - 1); // +3
        $this->generateMatch($tournament_id, '14:20', 1, 'B', $men_team_id + 4, $men_team_id + 2 + 4);
        $this->generateMatch($tournament_id, '14:20', 2, 'B', $men_team_id + 3 + 4, $men_team_id + 1 + 4);
        $this->generateMatch($tournament_id, '14:40', 1, 'C', $men_team_id + 8, $men_team_id + 2 + 8);
        $this->generateMatch($tournament_id, '14:40', 2, 'C', $men_team_id + 3 + 8, $men_team_id + 1 + 8);
        $this->generateMatch($tournament_id, '15:00', 1, 'D', $men_team_id + 12, $men_team_id + 2 + 12);
        $this->generateMatch($tournament_id, '15:00', 2, 'D', $men_team_id + 3 + 12, $men_team_id + 1 + 12);
        $this->generateMatch($tournament_id, '15:20', 1, 'W-A', $women_team_id, $women_team_id + 2);
        $this->generateMatch($tournament_id, '15:20', 2, 'W-A', $women_team_id + 3, $women_team_id + 1);


        $this->generateMatch($tournament_id, '15:40', 1, 'Q1', 1, 6);
        $this->generateMatch($tournament_id, '15:40', 2, 'Q2', 3, 8);
        $this->generateMatch($tournament_id, '16:00', 1, 'Q3', 5, 2);
        $this->generateMatch($tournament_id, '16:00', 2, 'Q4', 7, 4);
        $this->generateMatch($tournament_id, '16:20', 1, 'F', 15, 16);
        $this->generateMatch($tournament_id, '16:40', 1, 'S1', 9, 10);
        $this->generateMatch($tournament_id, '16:40', 2, 'S2', 11, 12);
        $this->generateMatch($tournament_id, '17:00', 1, 'F', 13, 14);        
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
