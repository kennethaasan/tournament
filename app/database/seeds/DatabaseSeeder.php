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
            'name' => 'Vanvikan Indoor 2019 Menn',
            'date' => '2019-01-19',
            'location' => 'Vanvikanhallen'
        ));

        Tournament::create(array(
            'name' => 'Vanvikan Indoor 2019 Kvinner',
            'date' => '2019-01-20',
            'location' => 'Vanvikanhallen'
        ));

    }
}

class TeamsTableSeeder extends Seeder {

    public function run()
    {
        DB::table('teams')->delete();

        Team::create(array('name' => 'Vinner gruppe A')); //1
        Team::create(array('name' => '2. plass gruppe A')); //2

        Team::create(array('name' => 'Vinner gruppe B')); //3
        Team::create(array('name' => '2. plass gruppe B')); //4

        Team::create(array('name' => 'Vinner gruppe C')); //5
        Team::create(array('name' => '2. plass gruppe C')); //6

        Team::create(array('name' => 'Vinner gruppe D')); //7
        Team::create(array('name' => '2. plass gruppe D')); //8

        Team::create(array('name' => 'Vinner Q1')); //9
        Team::create(array('name' => 'Vinner Q2')); //10
        Team::create(array('name' => 'Vinner Q3')); //11
        Team::create(array('name' => 'Vinner Q4')); //12

        Team::create(array('name' => 'Vinner S1')); //13
        Team::create(array('name' => 'Vinner S2')); //14

        Team::create(array('name' => 'Beste tredjeplass')); // 15
        Team::create(array('name' => 'Nest beste tredjeplass')); // 16
        Team::create(array('name' => 'Beste andreplass')); // 17


        Team::create(array('name' => 'Støren', 'group_code' => 'A')); // 1
        Team::create(array('name' => 'Neset FK', 'group_code' => 'A')); // 2
        Team::create(array('name' => 'FK Fosen 1', 'group_code' => 'A')); // 3
        Team::create(array('name' => 'Vanvik 2', 'group_code' => 'A')); // 4

        Team::create(array('name' => 'Vanvik 1', 'group_code' => 'B')); // 5
        Team::create(array('name' => 'Flatås', 'group_code' => 'B')); // 6
        Team::create(array('name' => 'Rissa IL', 'group_code' => 'B')); // 7
        Team::create(array('name' => 'FK Fosen 2', 'group_code' => 'B')); // 8

        Team::create(array('name' => 'Ørland BK', 'group_code' => 'C')); // 9
        Team::create(array('name' => 'Orkanger', 'group_code' => 'C')); // 10
        Team::create(array('name' => 'Leik', 'group_code' => 'C')); // 11
        Team::create(array('name' => 'FK Fosen 3', 'group_code' => 'C')); // 12


        Team::create(array('name' => 'Nardo FK 1', 'group_code' => 'A')); 
        Team::create(array('name' => 'Melhus IL', 'group_code' => 'A')); 
        Team::create(array('name' => 'Ørland', 'group_code' => 'A')); 
        Team::create(array('name' => 'Strindheim IL 3', 'group_code' => 'A')); 
        Team::create(array('name' => 'Tiller IL 2', 'group_code' => 'A')); 

        Team::create(array('name' => 'Strindheim IL 1', 'group_code' => 'B')); 
        Team::create(array('name' => 'Sverresborg', 'group_code' => 'B')); 
        Team::create(array('name' => 'Rissa IL', 'group_code' => 'B')); 
        Team::create(array('name' => 'Tiller IL 1', 'group_code' => 'B')); 

        Team::create(array('name' => 'Ranheim', 'group_code' => 'C')); 
        Team::create(array('name' => 'Flatås IL', 'group_code' => 'C')); 
        Team::create(array('name' => 'Strindheim IL 2', 'group_code' => 'C')); 
        Team::create(array('name' => 'Nardo FK 2', 'group_code' => 'C')); 

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
        $team_id = 17;

        $this->generateMatch($tournament_id, '09:00', 1, 'A', $team_id + 3, $team_id + 4);
        $this->generateMatch($tournament_id, '09:20', 1, 'A', $team_id + 1, $team_id + 2);

        $this->generateMatch($tournament_id, '09:40', 1, 'B', $team_id + 5, $team_id + 6);
        $this->generateMatch($tournament_id, '10:00', 1, 'B', $team_id + 7, $team_id + 8);

        $this->generateMatch($tournament_id, '10:20', 1, 'C', $team_id + 9, $team_id + 12);
        $this->generateMatch($tournament_id, '10:40', 1, 'C', $team_id + 10, $team_id + 11);


        $this->generateMatch($tournament_id, '11:00', 1, 'A', $team_id + 1, $team_id + 4);
        $this->generateMatch($tournament_id, '11:20', 1, 'A', $team_id + 2, $team_id + 3);

        $this->generateMatch($tournament_id, '11:40', 1, 'B', $team_id + 5, $team_id + 8);
        $this->generateMatch($tournament_id, '12:00', 1, 'B', $team_id + 6, $team_id + 7);

        $this->generateMatch($tournament_id, '12:20', 1, 'C', $team_id + 9, $team_id + 11);
        $this->generateMatch($tournament_id, '12:40', 1, 'C', $team_id + 10, $team_id + 12);


        $this->generateMatch($tournament_id, '13:00', 1, 'A', $team_id + 1, $team_id + 3);
        $this->generateMatch($tournament_id, '13:20', 1, 'A', $team_id + 2, $team_id + 4);

        $this->generateMatch($tournament_id, '13:40', 1, 'B', $team_id + 5, $team_id + 7);
        $this->generateMatch($tournament_id, '14:00', 1, 'B', $team_id + 6, $team_id + 8);

        $this->generateMatch($tournament_id, '14:20', 1, 'C', $team_id + 9, $team_id + 10);
        $this->generateMatch($tournament_id, '14:40', 1, 'C', $team_id + 11, $team_id + 12);


        $this->generateMatch($tournament_id, '15:00', 1, 'Q1', 1, 6);
        $this->generateMatch($tournament_id, '15:20', 1, 'Q2', 3, 16);

        $this->generateMatch($tournament_id, '15:40', 1, 'Q3', 5, 15);
        $this->generateMatch($tournament_id, '16:00', 1, 'Q4', 2, 4);

        $this->generateMatch($tournament_id, '16:20', 1, 'S1', 9, 10);
        $this->generateMatch($tournament_id, '16:40', 1, 'S2', 11, 12);

        $this->generateMatch($tournament_id, '17:10', 1, 'F', 13, 14);

        $tournament_id = 2;
        $team_id = 29;

        $this->generateMatch($tournament_id, '09:00', 1, 'A', $team_id + 1, $team_id + 3);
        $this->generateMatch($tournament_id, '09:20', 1, 'A', $team_id + 2, $team_id + 4);

        $this->generateMatch($tournament_id, '09:40', 1, 'B', $team_id + 6, $team_id + 7);
        $this->generateMatch($tournament_id, '10:00', 1, 'B', $team_id + 8, $team_id + 9);

        $this->generateMatch($tournament_id, '10:20', 1, 'C', $team_id + 10, $team_id + 11);
        $this->generateMatch($tournament_id, '10:40', 1, 'C', $team_id + 12, $team_id + 13);


        $this->generateMatch($tournament_id, '11:00', 1, 'A', $team_id + 1, $team_id + 2);
        $this->generateMatch($tournament_id, '11:20', 1, 'A', $team_id + 3, $team_id + 5);

        $this->generateMatch($tournament_id, '11:40', 1, 'C', $team_id + 10, $team_id + 12);
        $this->generateMatch($tournament_id, '12:00', 1, 'C', $team_id + 11, $team_id + 13);

        $this->generateMatch($tournament_id, '12:20', 1, 'B', $team_id + 6, $team_id + 9);
        $this->generateMatch($tournament_id, '12:40', 1, 'B', $team_id + 7, $team_id + 8);


        $this->generateMatch($tournament_id, '13:00', 1, 'A', $team_id + 1, $team_id + 4);
        $this->generateMatch($tournament_id, '13:20', 1, 'A', $team_id + 2, $team_id + 5);

        $this->generateMatch($tournament_id, '13:40', 1, 'C', $team_id + 10, $team_id + 13);
        $this->generateMatch($tournament_id, '14:00', 1, 'C', $team_id + 11, $team_id + 12);

        $this->generateMatch($tournament_id, '14:20', 1, 'A', $team_id + 1, $team_id + 5);
        $this->generateMatch($tournament_id, '14:40', 1, 'A', $team_id + 3, $team_id + 4);


        
        $this->generateMatch($tournament_id, '15:00', 1, 'B', $team_id + 6, $team_id + 8);
        $this->generateMatch($tournament_id, '15:20', 1, 'B', $team_id + 7, $team_id + 9);

        $this->generateMatch($tournament_id, '15:40', 1, 'A', $team_id + 2, $team_id + 3);
        $this->generateMatch($tournament_id, '16:00', 1, 'A', $team_id + 4, $team_id + 5);



        $this->generateMatch($tournament_id, '16:20', 1, 'S1', 5, 17);
        $this->generateMatch($tournament_id, '16:40', 1, 'S2', 1, 3);

        $this->generateMatch($tournament_id, '17:10', 1, 'F', 13, 14);





        // $this->generateMatch($tournament_id, '15:00', 1, 'Q1', 1, 4);
        // $this->generateMatch($tournament_id, '15:20', 1, 'Q2', 5, 8);

        // $this->generateMatch($tournament_id, '15:40', 1, 'Q3', 3, 2);
        // $this->generateMatch($tournament_id, '16:00', 1, 'Q4', 7, 6);

        // $this->generateMatch($tournament_id, '16:20', 1, 'S1', 9, 10);
        // $this->generateMatch($tournament_id, '16:40', 1, 'S2', 11, 12);

        // $this->generateMatch($tournament_id, '17:10', 1, 'F', 13, 14);

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
