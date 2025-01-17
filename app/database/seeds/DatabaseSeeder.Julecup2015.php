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
            'name' => 'Vanvikan Julecup 2024',
            'date' => '2024-12-30',
            'location' => 'Vanvikanhallen'
        ));

    }
}

class TeamsTableSeeder extends Seeder {

    public function run()
    {
        DB::table('teams')->delete();

        Team::create(array('name' => 'Posten 09', 'group_code' => 'A'));
        Team::create(array('name' => 'Frp’s Verste Frykt FC', 'group_code' => 'A'));
        Team::create(array('name' => 'Skåle Mål', 'group_code' => 'A'));
        Team::create(array('name' => 'Kipping FC', 'group_code' => 'A'));
        Team::create(array('name' => 'PJANKOW IL', 'group_code' => 'A'));

        Team::create(array('name' => 'Kjeks & Ballmiss', 'group_code' => 'B'));
        Team::create(array('name' => 'FC SKROVA', 'group_code' => 'B'));
        Team::create(array('name' => 'Anne Frankfurt', 'group_code' => 'B'));
        Team::create(array('name' => 'Stjørnas Glade Gutter', 'group_code' => 'B'));
        Team::create(array('name' => 'Liggeunderlaget', 'group_code' => 'B'));

        Team::create(array('name' => 'Inter Ya Nan', 'group_code' => 'C'));
        Team::create(array('name' => 'Jerv', 'group_code' => 'C'));
        Team::create(array('name' => 'Team Storsve&Jr', 'group_code' => 'C'));
        Team::create(array('name' => 'Leksvik Oldboys', 'group_code' => 'C'));
        Team::create(array('name' => 'Tors Disipler', 'group_code' => 'C'));

        Team::create(array('name' => 'Joga Bonito', 'group_code' => 'D'));
        Team::create(array('name' => 'Glørsk BK', 'group_code' => 'D'));
        Team::create(array('name' => 'Guttelim', 'group_code' => 'D'));
        Team::create(array('name' => 'Samba De Fosen', 'group_code' => 'D'));
        
        Team::create(array('name' => 'Redda BK', 'group_code' => 'E'));
        Team::create(array('name' => 'Tuttisfrutti FC', 'group_code' => 'E'));
        Team::create(array('name' => 'Servi FC', 'group_code' => 'E'));
        Team::create(array('name' => 'Mannschaft', 'group_code' => 'E'));

        Team::create(array('name' => 'Røkla', 'group_code' => 'W'));
        Team::create(array('name' => 'Stadsbygd damelag', 'group_code' => 'W'));
        Team::create(array('name' => 'ROSENCROCS', 'group_code' => 'W'));

        Team::create(array('name' => 'Vinner gruppe A')); 
        
        Team::create(array('name' => 'Vinner gruppe B')); 

        Team::create(array('name' => 'Vinner gruppe C')); 
        
        Team::create(array('name' => 'Vinner gruppe D')); 
        
        Team::create(array('name' => 'Vinner gruppe E'));

        Team::create(array('name' => 'Andreplass'));
        Team::create(array('name' => 'Andreplass'));
        Team::create(array('name' => 'Andreplass'));

        Team::create(array('name' => 'Vinner Q1')); 
        Team::create(array('name' => 'Vinner Q2')); 
        Team::create(array('name' => 'Vinner Q3')); 
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

				$this->generateMatch(1, '10:30', 1, 'C', 1+10, 4+10);
        $this->generateMatch(1, '10:30', 2, 'C', 2+10, 5+10);

        $this->generateMatch(1, '10:45', 1, 'A', 1, 3);
        $this->generateMatch(1, '10:45', 2, 'A', 4, 5);

        $this->generateMatch(1, '11:00', 1, 'B', 1+5, 3+5);
        $this->generateMatch(1, '11:00', 2, 'B', 4+5, 5+5);

        $this->generateMatch(1, '11:15', 1, 'C', 1+10, 3+10);
        $this->generateMatch(1, '11:15', 2, 'C', 4+10, 5+10);

        $this->generateMatch(1, '11:30', 1, 'D', 1+15, 4+15);
        $this->generateMatch(1, '11:30', 2, 'D', 2+15, 3+15);

        $this->generateMatch(1, '11:45', 1, 'E', 1+19, 4+19);
        $this->generateMatch(1, '11:45', 2, 'E', 2+19, 3+19);

        $this->generateMatch(1, '12:00', 1, 'W', 1+23, 2+23);

        $this->generateMatch(1, '12:15', 1, 'A', 1, 2);
        $this->generateMatch(1, '12:15', 2, 'A', 3, 4);

        $this->generateMatch(1, '12:30', 1, 'B', 1+5, 2+5);
        $this->generateMatch(1, '12:30', 2, 'B', 3+5, 4+5);

        $this->generateMatch(1, '12:45', 1, 'C', 1+10, 2+10);
        $this->generateMatch(1, '12:45', 2, 'C', 3+10, 4+10);

        $this->generateMatch(1, '13:00', 1, 'D', 1+15, 2+15);
        $this->generateMatch(1, '13:00', 2, 'D', 3+15, 4+15);

        $this->generateMatch(1, '13:15', 1, 'E', 1+19, 2+19);
        $this->generateMatch(1, '13:15', 2, 'E', 3+19, 4+19);

        $this->generateMatch(1, '13:30', 1, 'W', 1+23, 3+23);

        $this->generateMatch(1, '13:45', 1, 'A', 1, 5);
        $this->generateMatch(1, '13:45', 2, 'A', 2, 3);

        $this->generateMatch(1, '14:00', 1, 'B', 1+5, 5+5);
        $this->generateMatch(1, '14:00', 2, 'B', 2+5, 3+5);

        $this->generateMatch(1, '14:15', 1, 'C', 1+10, 5+10);
        $this->generateMatch(1, '14:15', 2, 'C', 2+10, 3+10);

        $this->generateMatch(1, '14:30', 1, 'D', 1+15, 3+15);
        $this->generateMatch(1, '14:30', 2, 'D', 2+15, 4+15);

        $this->generateMatch(1, '14:45', 1, 'E', 1+19, 3+19);
        $this->generateMatch(1, '14:45', 2, 'E', 2+19, 4+19);

        $this->generateMatch(1, '15:00', 1, 'W', 2+23, 3+23);

        $this->generateMatch(1, '15:15', 1, 'A', 2, 4);
        $this->generateMatch(1, '15:15', 2, 'A', 3, 5);

        $this->generateMatch(1, '15:30', 1, 'B', 2+5, 4+5);
        $this->generateMatch(1, '15:30', 2, 'B', 3+5, 5+5);

        $this->generateMatch(1, '15:45', 1, 'C', 2+10, 4+10);
        $this->generateMatch(1, '15:45', 2, 'C', 3+10, 5+10);

        $this->generateMatch(1, '16:00', 1, 'W', 1+23, 2+23);

        $this->generateMatch(1, '16:15', 1, 'Q1', 1+26, 6+26);
        $this->generateMatch(1, '16:15', 2, 'Q2', 2+26, 7+26);

        $this->generateMatch(1, '16:30', 1, 'Q3', 3+26, 8+26);
        $this->generateMatch(1, '16:30', 2, 'Q4', 4+26, 5+26);

        $this->generateMatch(1, '16:45', 1, 'W', 1+23, 3+23);

        $this->generateMatch(1, '17:00', 1, 'S1', 9+26, 10+26);
        $this->generateMatch(1, '17:00', 2, 'S2', 11+26, 12+26);

        $this->generateMatch(1, '17:15', 1, 'W', 2+23, 3+23);

        $this->generateMatch(1, '17:30', 1, 'F', 13+26, 14+26);



				// $this->generateMatch(1, '10:45', 1, 'D', 1+15, 4+15);
        // $this->generateMatch(1, '10:45', 2, 'D', 2+15, 5+15);

        // $this->generateMatch(1, '11:00', 1, 'W', 1+20, 4+20);
        // $this->generateMatch(1, '11:00', 2, 'W', 2+20, 5+20);


				// $this->generateMatch(1, '11:15', 1, 'A', 1, 3);
				// $this->generateMatch(1, '11:15', 2, 'A', 4, 5);

				// $this->generateMatch(1, '11:30', 1, 'B', 1+5, 3+5);
				// $this->generateMatch(1, '11:30', 2, 'B', 4+5, 5+5);
				// //
				// $this->generateMatch(1, '11:45', 1, 'C', 1+10, 5+10);
				// $this->generateMatch(1, '11:45', 2, 'C', 3+10, 4+10);
				// //
				// $this->generateMatch(1, '12:00', 1, 'D', 1+15, 3+15);
				// $this->generateMatch(1, '12:00', 2, 'D', 4+15, 5+15);

        // $this->generateMatch(1, '12:15', 1, 'W', 1+20, 3+20);
				// $this->generateMatch(1, '12:15', 2, 'W', 4+20, 5+20);


        // $this->generateMatch(1, '12:30', 1, 'A', 1, 2);
				// $this->generateMatch(1, '12:30', 2, 'A', 3, 4);
				// //
				// $this->generateMatch(1, '12:45', 1, 'B', 1+5, 2+5);
				// $this->generateMatch(1, '12:45', 2, 'B', 3+5, 4+5);
				// //
				// $this->generateMatch(1, '13:00', 1, 'C', 1+10, 4+10);
				// $this->generateMatch(1, '13:00', 2, 'C', 2+10, 5+10);
				// //
				// $this->generateMatch(1, '13:15', 1, 'D', 1+15, 2+15);
				// $this->generateMatch(1, '13:15', 2, 'D', 3+15, 4+15);

        // $this->generateMatch(1, '13:30', 1, 'W', 1+20, 2+20);
				// $this->generateMatch(1, '13:30', 2, 'W', 3+20, 4+20);

				
				// $this->generateMatch(1, '13:45', 1, 'A', 1, 5);
        // $this->generateMatch(1, '13:45', 2, 'A', 2, 3);
				// //
        // $this->generateMatch(1, '14:00', 1, 'B', 1+5, 5+5);
        // $this->generateMatch(1, '14:00', 2, 'B', 2+5, 3+5);
				// //
        // $this->generateMatch(1, '14:15', 1, 'C', 1+10, 2+10);
        // $this->generateMatch(1, '14:15', 2, 'C', 3+10, 5+10);
				// //
        // $this->generateMatch(1, '14:30', 1, 'D', 1+15, 5+15);
        // $this->generateMatch(1, '14:30', 2, 'D', 2+15, 3+15);

        // $this->generateMatch(1, '14:45', 1, 'W', 1+20, 5+20);
        // $this->generateMatch(1, '14:45', 2, 'W', 2+20, 3+20);


				// $this->generateMatch(1, '15:00', 1, 'A', 2, 4);
				// $this->generateMatch(1, '15:00', 2, 'A', 3, 5);
				// //
				// $this->generateMatch(1, '15:15', 1, 'B', 2+5, 4+5);
				// $this->generateMatch(1, '15:15', 2, 'B', 3+5, 5+5);
				// //
				// $this->generateMatch(1, '15:30', 1, 'C', 1+10, 3+10);
				// $this->generateMatch(1, '15:30', 2, 'C', 2+10, 4+10);
				// //
				// $this->generateMatch(1, '15:45', 1, 'D', 2+15, 4+15);
				// $this->generateMatch(1, '15:45', 2, 'D', 3+15, 5+15);
				
        // $this->generateMatch(1, '16:00', 1, 'W', 2+20, 4+20);
				// $this->generateMatch(1, '16:00', 2, 'W', 3+20, 5+20);


				// $this->generateMatch(1, '16:15', 1, 'Q1', 1+25, 6+25);
        // $this->generateMatch(1, '16:15', 2, 'Q2', 3+25, 8+25);

        // $this->generateMatch(1, '16:30', 1, 'Q3', 5+25, 2+25);
        // $this->generateMatch(1, '16:30', 2, 'Q4', 7+25, 4+25);

        // $this->generateMatch(1, '16:45', 1, 'F', 9+25, 10+25);

        // $this->generateMatch(1, '17:00', 1, 'S1', 11+25, 12+25);
        // $this->generateMatch(1, '17:00', 2, 'S2', 13+25, 14+25);

        // $this->generateMatch(1, '17:15', 1, 'F', 15+25, 16+25);

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
